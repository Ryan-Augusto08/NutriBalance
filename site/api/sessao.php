<?php
/**
 * Estado da sessão — guarda das páginas e fonte do perfil para o dashboard.
 *   GET api/sessao.php
 * Sem sessão → 401. Com sessão → devolve o usuário e o perfil no formato que
 * o app.js usa (goalKcal/goalCarbo/... em camelCase).
 */

require __DIR__ . '/_bootstrap.php';

exigir_metodo('GET');

$uid = exigir_login();

try {
    $pdo  = conectar();
    $stmt = $pdo->prepare(
        'SELECT id, nome, email, foto, sexo, idade, altura_cm, peso_kg, cintura_cm, peso_alvo, atividade, meta, objetivo,
                goal_kcal, goal_carbo, goal_proteina, goal_gordura
         FROM usuarios WHERE id = ?'
    );
    $stmt->execute([$uid]);
    $u = $stmt->fetch();

    if (!$u) {
        // Usuário sumiu do banco — encerra a sessão órfã.
        session_destroy();
        responder(['erro' => 'Não autenticado.'], 401);
    }

    $perfilCompleto = $u['goal_kcal'] !== null;

    responder([
        'ok'              => true,
        'perfil_completo' => $perfilCompleto,
        'usuario'         => [
            'id'    => (int) $u['id'],
            'nome'  => $u['nome'],
            'email' => $u['email'],
            'foto'  => $u['foto'] ?: null,
        ],
        'perfil'          => [
            'sexo'         => $u['sexo'],
            'idade'        => $u['idade'] !== null ? (int) $u['idade'] : null,
            'altura_cm'    => $u['altura_cm'] !== null ? (int) $u['altura_cm'] : null,
            'peso_kg'      => $u['peso_kg'] !== null ? (float) $u['peso_kg'] : null,
            'cintura_cm'   => $u['cintura_cm'] !== null ? (float) $u['cintura_cm'] : null,
            'peso_alvo'    => $u['peso_alvo'] !== null ? (float) $u['peso_alvo'] : null,
            'atividade'    => $u['atividade'],
            'meta'         => $u['meta'],
            'objetivo'     => $u['objetivo'],
            'goalKcal'     => $u['goal_kcal'] !== null ? (int) $u['goal_kcal'] : null,
            'goalCarbo'    => $u['goal_carbo'] !== null ? (int) $u['goal_carbo'] : null,
            'goalProteina' => $u['goal_proteina'] !== null ? (int) $u['goal_proteina'] : null,
            'goalGordura'  => $u['goal_gordura'] !== null ? (int) $u['goal_gordura'] : null,
        ],
    ]);
} catch (Throwable $e) {
    responder(['erro' => 'Falha ao carregar a sessão.'], 500);
}
