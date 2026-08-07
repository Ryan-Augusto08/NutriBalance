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
 * A resposta é SEMPRE a mesma, exista ou não a conta. Se respondesse
 * "e-mail não cadastrado", qualquer pessoa poderia usar esta tela para
 * descobrir quem tem conta no site (mesmo critério do login.php).
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

// Mesma resposta em todos os caminhos de sucesso — ver comentário do topo.
$respostaGenerica = [
    'ok' => true,
    'mensagem' => 'Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha. '
        . 'O link vale por 1 hora. Confira também a caixa de spam.',
];

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    responder(['erro' => 'E-mail inválido.'], 422);
}

try {
    $pdo = conectar();

    $stmt = $pdo->prepare('SELECT id, nome FROM usuarios WHERE email = ?');
    $stmt->execute([$email]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        responder($respostaGenerica);
    }

    // Já houve um pedido há poucos segundos? Não gera outro, mas responde
    // igual — assim ninguém usa o tempo de resposta para deduzir nada.
    $recente = $pdo->prepare(
        'SELECT id FROM redefinicoes_senha
          WHERE usuario_id = ?
            AND criado_em > DATE_SUB(NOW(), INTERVAL ' . INTERVALO_MINIMO_SEGUNDOS . ' SECOND)
          LIMIT 1'
    );
    $recente->execute([$usuario['id']]);
    if ($recente->fetch()) {
        responder($respostaGenerica);
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

    $link = url_site() . '/redefinir-senha.html?token=' . $token;
    $nome = htmlspecialchars($usuario['nome'], ENT_QUOTES, 'UTF-8');
    $linkSeguro = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');

    $corpoHtml = <<<HTML
        <div style="font-family: Arial, Helvetica, sans-serif; color: #26312a; line-height: 1.5;">
          <h2 style="color: #2f6d3f; margin: 0 0 12px;">Redefinição de senha</h2>
          <p>Olá, {$nome}.</p>
          <p>Recebemos um pedido para redefinir a senha da sua conta no NutriBalance.
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
        . "Recebemos um pedido para redefinir a senha da sua conta no NutriBalance.\n"
        . "Abra o endereço abaixo para cadastrar uma senha nova:\n\n"
        . "{$link}\n\n"
        . "O link vale por 1 hora e só pode ser usado uma vez.\n"
        . "Se não foi você quem pediu, ignore esta mensagem.\n";

    enviar_email($email, 'Redefinição de senha — NutriBalance', $corpoHtml, $corpoTexto);

    // Mesmo que o SMTP falhe, a resposta é a genérica: o motivo da falha
    // fica no log do servidor, não na tela de quem pediu.
    responder($respostaGenerica);
} catch (Throwable $e) {
    error_log('NutriBalance: erro em esqueceu_senha.php — ' . $e->getMessage());
    responder(['erro' => 'Falha ao processar o pedido.'], 500);
}
