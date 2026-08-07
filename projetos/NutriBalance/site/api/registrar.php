<?php
/**
 * Cadastro de usuário.
 *   POST api/registrar.php  { nome, email, senha }
 * Cria a conta (senha com hash), abre a sessão e retorna { ok, perfil_completo }.
 * Perfil sempre começa incompleto (personalização vem depois).
 */

require __DIR__ . '/_bootstrap.php';

exigir_metodo('POST');

$dados = corpo();
$nome  = trim($dados['nome'] ?? '');
$email = trim($dados['email'] ?? '');
$senha = (string) ($dados['senha'] ?? '');

if ($nome === '' || mb_strlen($nome) > 120) {
    responder(['erro' => 'Informe seu nome.'], 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
    responder(['erro' => 'E-mail inválido.'], 422);
}
if (mb_strlen($senha) < 6) {
    responder(['erro' => 'A senha precisa ter pelo menos 6 caracteres.'], 422);
}

try {
    $pdo = conectar();

    // e-mail já cadastrado?
    $existe = $pdo->prepare('SELECT id FROM usuarios WHERE email = ?');
    $existe->execute([$email]);
    if ($existe->fetch()) {
        responder(['erro' => 'Esse e-mail já está cadastrado.'], 409);
    }

    // A senha digitada NUNCA é gravada. password_hash a transforma num
    // texto de mão única — do hash não se volta à senha. É por isso que o
    // sistema não consegue "lembrar" a senha de ninguém, só permitir
    // cadastrar outra (ver esqueceu_senha.php).
    //
    // PASSWORD_DEFAULT deixa o PHP escolher o algoritmo atual em vez de
    // fixar um: quando surgir um mais forte, novas contas já o usam sem
    // mudar esta linha. A função também embute um salt aleatório, então
    // duas pessoas com a mesma senha ficam com hashes diferentes — o que
    // inutiliza tabelas de hash pré-calculadas.
    $hash = password_hash($senha, PASSWORD_DEFAULT);

    // Consulta preparada: o SQL vai com `?` e os valores viajam separados.
    // O banco nunca interpreta o que o usuário digitou como comando, então
    // um nome como  '); DROP TABLE usuarios; --  é gravado como texto.
    $stmt = $pdo->prepare('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)');
    $stmt->execute([$nome, $email, $hash]);

    $uid = (int) $pdo->lastInsertId();
    session_regenerate_id(true);
    $_SESSION['uid'] = $uid;

    responder(['ok' => true, 'perfil_completo' => false]);
} catch (Throwable $e) {
    responder(['erro' => 'Falha ao criar a conta.'], 500);
}
