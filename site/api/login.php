<?php
/**
 * Login.
 *   POST api/login.php  { email, senha }
 * Verifica a senha (password_verify), abre a sessão e retorna
 * { ok, perfil_completo } para o front decidir onboarding vs. dashboard.
 */

require __DIR__ . '/_bootstrap.php';

exigir_metodo('POST');

$dados = corpo();
$email = trim($dados['email'] ?? '');
$senha = (string) ($dados['senha'] ?? '');

if ($email === '' || $senha === '') {
    responder(['erro' => 'Informe e-mail e senha.'], 422);
}

try {
    $pdo  = conectar();
    $stmt = $pdo->prepare('SELECT id, senha_hash, meta_kcal FROM usuarios WHERE email = ?');
    $stmt->execute([$email]);
    $u = $stmt->fetch();

    // password_verify aplica à senha digitada o mesmo hash guardado no
    // banco e compara os dois. O caminho inverso não existe: do
    // `senha_hash` não se recupera a senha original, nem aqui nem para
    // quem eventualmente roubasse o banco.
    //
    // Mensagem genérica (não revela se o e-mail existe): dizer "esse
    // e-mail não tem conta" transformaria a tela de login numa ferramenta
    // para descobrir quem é cadastrado no site.
    if (!$u || !password_verify($senha, $u['senha_hash'])) {
        responder(['erro' => 'E-mail ou senha incorretos.'], 401);
    }

    // Troca o identificador da sessão agora que a pessoa se autenticou.
    // Protege contra fixação de sessão: um atacante que tivesse plantado
    // um id conhecido no navegador da vítima antes do login fica com um
    // id que não vale mais nada.
    session_regenerate_id(true);
    $_SESSION['uid'] = (int) $u['id'];

    responder(['ok' => true, 'perfil_completo' => $u['meta_kcal'] !== null]);
} catch (Throwable $e) {
    responder(['erro' => 'Falha ao entrar.'], 500);
}
