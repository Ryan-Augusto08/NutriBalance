<?php
/**
 * Lista as medicoes (peso/cintura) do usuario logado, em ordem cronologica.
 *   GET api/listar_medicoes.php
 * Devolve um array JSON: [{ data, peso_kg, cintura_cm }, ...] — dados do grafico.
 */

require __DIR__ . '/_bootstrap.php';

exigir_metodo('GET');

$uid = exigir_login();

try {
    $pdo  = conectar();
    $stmt = $pdo->prepare(
        'SELECT data, peso_kg, cintura_cm
         FROM medicoes WHERE usuario_id = ? ORDER BY data ASC, id ASC'
    );
    $stmt->execute([$uid]);

    $linhas = [];
    foreach ($stmt->fetchAll() as $m) {
        $linhas[] = [
            'data'       => $m['data'],
            'peso_kg'    => (float) $m['peso_kg'],
            'cintura_cm' => $m['cintura_cm'] !== null ? (float) $m['cintura_cm'] : null,
        ];
    }

    responder(['ok' => true, 'medicoes' => $linhas]);
} catch (Throwable $e) {
    responder(['erro' => 'Falha ao carregar as medicoes.'], 500);
}
