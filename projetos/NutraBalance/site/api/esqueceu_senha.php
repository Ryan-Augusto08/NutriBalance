<?php
/**
 * Pedido de redefinição de senha ("esqueci minha senha").
 *   POST api/esqueceu_senha.php  { email }
 *
 * Gera um token aleatório de uso único, guarda só o SHA-256 dele em
 * `redefinicoes_senha` e manda o link por e-mail. A senha atual não é
 * alterada aqui — quem troca é o redefinir_senha.php, depois que a pessoa
 * provar que recebeu o e-mail.
 *
 * E-mail sem conta recebe "não cadastrado" e nenhum link é gerado. Até
 * 17/10/2026 a resposta era sempre a mesma, exista ou não a conta, para
 * ninguém usar esta tela para descobrir quem tem cadastro. Saiu porque não
 * protegia nada: o registrar.php já responde "Esse e-mail já está
 * cadastrado", e é assim que tem que ser, senão a pessoa não sabe por que o
 * cadastro falhou. E a resposta genérica confundia: "enviamos um link" para
 * um endereço que nunca recebe nada.
 *
 * O login.php continua com a mensagem única de "e-mail ou senha incorretos":
 * lá o que se protege é a senha, não a existência da conta.
 */

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/email.php';

exigir_metodo('POST');

/** Por quanto tempo o link continua valendo. */
const VALIDADE_MINUTOS = 60;

/** Intervalo mínimo entre dois pedidos da mesma conta (anti-flood). */
const INTERVALO_MINIMO_SEGUNDOS = 60;

$dados = corpo();
$email = trim($dados['email'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    responder(['erro' => 'E-mail inválido.'], 422);
}

try {
    $pdo = conectar();

    // O e-mail que vale é o do cadastro, não o digitado. A comparação do
    // MySQL ignora maiúsculas, então "Ana@Gmail.com" acha a conta de
    // "ana@gmail.com" — e o link vai para o endereço que está no banco.
    $stmt = $pdo->prepare('SELECT id, nome, email FROM usuarios WHERE email = ?');
    $stmt->execute([$email]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        responder(['erro' => 'Esse e-mail não está cadastrado no NutraBalance.'], 404);
    }

    // Já houve um pedido há poucos segundos? Não gera outro: o link do
    // pedido anterior continua valendo e está a caminho.
    $recente = $pdo->prepare(
        'SELECT id FROM redefinicoes_senha
          WHERE usuario_id = ?
            AND criado_em > DATE_SUB(NOW(), INTERVAL ' . INTERVALO_MINIMO_SEGUNDOS . ' SECOND)
          LIMIT 1'
    );
    $recente->execute([$usuario['id']]);
    if ($recente->fetch()) {
        responder([
            'ok' => true,
            'mensagem' => 'Já enviamos um link para esse e-mail há menos de 1 minuto. '
                . 'Confira a caixa de entrada e o spam antes de pedir outro.',
        ]);
    }

    // Pedir um link novo invalida os anteriores: só o último e-mail funciona.
    $pdo->prepare('UPDATE redefinicoes_senha SET usado_em = NOW()
                    WHERE usuario_id = ? AND usado_em IS NULL')
        ->execute([$usuario['id']]);

    // random_bytes é o gerador criptográfico do PHP. Nada de md5(time()):
    // o horário é previsível, e quem soubesse o segundo do pedido acertaria
    // o token por tentativa e erro.
    $token = bin2hex(random_bytes(32));

    $pdo->prepare(
        'INSERT INTO redefinicoes_senha (usuario_id, token_hash, expira_em)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ' . VALIDADE_MINUTOS . ' MINUTE))'
    )->execute([$usuario['id'], hash('sha256', $token)]);
    $pedidoId = $pdo->lastInsertId();

    $link = url_site() . '/redefinir-senha.html?token=' . $token;
    $nome = htmlspecialchars($usuario['nome'], ENT_QUOTES, 'UTF-8');
    $linkSeguro = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');

    $corpoHtml = <<<HTML
        <div style="font-family: Arial, Helvetica, sans-serif; color: #26312a; line-height: 1.5;">
          <h2 style="color: #2f6d3f; margin: 0 0 12px;">Redefinição de senha</h2>
          <p>Olá, {$nome}.</p>
          <p>Recebemos um pedido para redefinir a senha da sua conta no NutraBalance.
             Clique no botão abaixo para cadastrar uma senha nova:</p>
          <p style="margin: 24px 0;">
            <a href="{$linkSeguro}"
               style="background: #3b8a4e; color: #ffffff; text-decoration: none;
                      font-weight: bold; padding: 12px 22px; border-radius: 10px;
                      display: inline-block;">Criar nova senha</a>
          </p>
          <p style="font-size: 13px; color: #7c8a80;">
            O link vale por 1 hora e só pode ser usado uma vez.<br />
            Se o botão não funcionar, copie e cole este endereço no navegador:<br />
            <span style="word-break: break-all;">{$linkSeguro}</span>
          </p>
          <p style="font-size: 13px; color: #7c8a80;">
            Se não foi você quem pediu, ignore esta mensagem — sua senha atual continua valendo.
          </p>
        </div>
        HTML;

    $corpoTexto = "Olá, {$usuario['nome']}.\n\n"
        . "Recebemos um pedido para redefinir a senha da sua conta no NutraBalance.\n"
        . "Abra o endereço abaixo para cadastrar uma senha nova:\n\n"
        . "{$link}\n\n"
        . "O link vale por 1 hora e só pode ser usado uma vez.\n"
        . "Se não foi você quem pediu, ignore esta mensagem.\n";

    $enviado = enviar_email(
        $usuario['email'], 'Redefinição de senha — NutraBalance', $corpoHtml, $corpoTexto
    );

    if (!$enviado) {
        // O link nunca saiu, então o pedido é desfeito: sem isso, o anti-flood
        // barraria a nova tentativa dizendo "já enviamos". O motivo real da
        // falha (senha de app, rede) fica no log; a tela só diz que não foi.
        $pdo->prepare('DELETE FROM redefinicoes_senha WHERE id = ?')->execute([$pedidoId]);
        responder(['erro' => 'Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.'], 502);
    }

    responder([
        'ok' => true,
        'mensagem' => 'Enviamos um link para redefinir a senha. '
            . 'Ele vale por 1 hora. Confira também a caixa de spam.',
    ]);
} catch (Throwable $e) {
    error_log('NutraBalance: erro em esqueceu_senha.php — ' . $e->getMessage());
    falhar($e, 'Falha ao processar o pedido.');
}
