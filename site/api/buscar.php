<?php
/**
 * Endpoint de busca de alimentos na TACO.
 *
 *   GET api/buscar.php?q=arroz cozido
 *
 * Devolve um JSON no mesmo formato que o site espera para cada alimento:
 *   { nome, marca, categoria, kcal100, p100, c100, g100 }
 * Todos os valores nutricionais sao por 100 g.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require __DIR__ . '/conexao.php';

$q = trim($_GET['q'] ?? '');

// precisa de pelo menos 2 caracteres, igual ao comportamento do site
if (mb_strlen($q) < 2) {
    echo json_encode([]);
    exit;
}

try {
    $pdo = conectar();

    // cada palavra digitada vira um LIKE; todas precisam aparecer na descricao
    // (ex: "arroz cozido" casa com "Arroz, integral, cozido").
    // A collation utf8mb4_unicode_ci ja ignora acentos e maiusculas.
    $palavras = preg_split('/\s+/', $q, -1, PREG_SPLIT_NO_EMPTY);
    $condicoes = [];
    $params = [];
    foreach ($palavras as $i => $palavra) {
        $condicoes[] = 'descricao LIKE ?';
        $params[] = '%' . $palavra . '%';
    }

    $sql = 'SELECT descricao, categoria, energia_kcal, proteina, carboidrato, lipideos
            FROM alimentos
            WHERE energia_kcal IS NOT NULL AND ' . implode(' AND ', $condicoes) . '
            ORDER BY descricao
            LIMIT 30';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $resultado = [];
    foreach ($stmt as $row) {
        $resultado[] = [
            'nome'      => $row['descricao'],
            'marca'     => '',                       // TACO nao tem marca
            'categoria' => $row['categoria'],
            'kcal100'   => (float) $row['energia_kcal'],
            'p100'      => (float) $row['proteina'],
            'c100'      => (float) $row['carboidrato'],
            'g100'      => (float) $row['lipideos'],
        ];
    }

    echo json_encode($resultado, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['erro' => 'Falha ao consultar o banco de alimentos.']);
}
