<?php
/**
 * Bootstrap comum aos endpoints de conta/perfil do NutriBalance.
 * Abre a sessão, define cabeçalhos JSON e helpers de resposta.
 */

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require __DIR__ . '/conexao.php';

/** Envia um JSON e encerra. */
function responder(array $dados, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Lê o corpo da requisição como JSON (ou cai no $_POST de formulário). */
function corpo(): array
{
    $raw = file_get_contents('php://input');
    if ($raw !== false && $raw !== '') {
        $json = json_decode($raw, true);
        if (is_array($json)) {
            return $json;
        }
    }
    return $_POST;
}

/** Exige método HTTP; encerra com 405 se não bater. */
function exigir_metodo(string $metodo): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $metodo) {
        responder(['erro' => 'Método não permitido.'], 405);
    }
}

/** Retorna o id do usuário logado ou encerra com 401. */
function exigir_login(): int
{
    if (empty($_SESSION['uid'])) {
        responder(['erro' => 'Não autenticado.'], 401);
    }
    return (int) $_SESSION['uid'];
}
