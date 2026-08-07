<?php
/**
 * Troca a senha a partir do token recebido por e-mail.
 *   POST api/redefinir_senha.php  { token, senha }
 *
 * O token vale uma vez só e dentro do prazo. A gravação da senha nova e a
 * baixa do token acontecem na mesma transação: ou as duas valem, ou
 * nenhuma. Sem isso, uma falha no meio deixaria o link ativo depois de já
 * ter trocado a senha.
 */

require __DIR__ . '/_bootstrap.php';

exigir_metodo('POST');

$dados = corpo();
$token = trim($dados['token'] ?? '');
$senha = (string) ($dados['senha'] ?? '');

// O token é gerado por bin2hex(random_bytes(32)): 64 caracteres hexadecimais.
// Qualquer coisa fora desse formato nem chega a consultar o banco.
if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
    responder(['erro' => 'Link inválido ou expirado. Peça um novo.'], 422);
}
if (mb_strlen($senha) < 6) {
    responder(['erro' => 'A senha precisa ter pelo menos 6 caracteres.'], 422);
}

$pdo = null;

try {
    $pdo = conectar();

    // Busca pelo hash: o token em claro nunca esteve no banco.
    $stmt = $pdo->prepare(
        'SELECT id, usuario_id FROM redefinicoes_senha
          WHERE token_hash = ? AND usado_em IS NULL AND expira_em > NOW()'
    );
    $stmt->execute([hash('sha256', $token)]);
    $pedido = $stmt->fetch();

    // Mensagem única para link inexistente, já usado e vencido — não vale
    // contar qual dos três é.
    if (!$pedido) {
        responder(['erro' => 'Link inválido ou expirado. Peça um novo.'], 400);
    }

    $pdo->beginTransaction();

    $pdo->prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?')
        ->execute([password_hash($senha, PASSWORD_DEFAULT), $pedido['usuario_id']]);

    $pdo->prepare('UPDATE redefinicoes_senha SET usado_em = NOW() WHERE id = ?')
        ->execute([$pedido['id']]);

    $pdo->commit();

    // Encerra a sessão deste navegador: quem redefine a senha entra de novo
    // com ela, e uma sessão antiga aberta aqui não deve sobreviver à troca.
    $_SESSION = [];
    session_regenerate_id(true);

    responder(['ok' => true]);
} catch (Throwable $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('NutriBalance: erro em redefinir_senha.php — ' . $e->getMessage());
    responder(['erro' => 'Falha ao redefinir a senha.'], 500);
}
