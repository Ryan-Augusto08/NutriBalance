<?php
/**
 * Registra (ou atualiza) uma medicao de peso/cintura do usuario logado.
 *   POST api/salvar_medicao.php  { data, peso_kg, cintura_cm }
 * Um registro por dia: se ja existir medicao nessa data, atualiza (upsert).
 *
 * Depois de salvar, sincroniza o PERFIL com o peso mais recente: atualiza
 * usuarios.peso_kg e RECALCULA as metas (meta_kcal + macros) — mesma formula
 * de salvar_perfil.php — para o dashboard e a previsao (preverResultado)
 * ficarem coerentes com o peso mais novo. So recalcula se o perfil ja estiver
 * completo (tem sexo/idade/altura/atividade/meta).
 */

require __DIR__ . '/_bootstrap.php';

exigir_metodo('POST');

$uid = exigir_login();

const FATOR_ATIVIDADE = [
    'sedentario'    => 1.2,
    'leve'          => 1.375,
    'moderado'      => 1.55,
    'intenso'       => 1.725,
    'muito_intenso' => 1.9,
];
const AJUSTE_META = [
    'perder' => -0.15,
    'manter' => 0.0,
    'ganhar' => 0.15,
];

$dados     = corpo();
$data      = trim((string) ($dados['data'] ?? ''));
$peso      = (float) ($dados['peso_kg'] ?? 0);
$cinturaIn = $dados['cintura_cm'] ?? null;

// validacao de faixas
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data)) {
    responder(['erro' => 'Data invalida.'], 422);
}
$d = DateTime::createFromFormat('!Y-m-d', $data);
$erros = DateTime::getLastErrors();
if (!$d || ($erros && ($erros['warning_count'] || $erros['error_count']))) {
    responder(['erro' => 'Data invalida.'], 422);
}
if ($data > date('Y-m-d')) {
    responder(['erro' => 'A data nao pode ser no futuro.'], 422);
}
if ($peso < 30 || $peso > 350) {
    responder(['erro' => 'Peso fora da faixa (30 a 350 kg).'], 422);
}
$cintura = null;
if ($cinturaIn !== null && $cinturaIn !== '') {
    $cintura = (float) $cinturaIn;
    if ($cintura < 30 || $cintura > 200) {
        responder(['erro' => 'Cintura fora da faixa (30 a 200 cm).'], 422);
    }
}

try {
    $pdo = conectar();

    // Upsert: um registro por dia por usuario (UNIQUE usuario_id + data).
    $stmt = $pdo->prepare(
        'INSERT INTO medicoes (usuario_id, data, peso_kg, cintura_cm)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE peso_kg = VALUES(peso_kg), cintura_cm = VALUES(cintura_cm)'
    );
    $stmt->execute([$uid, $data, $peso, $cintura]);

    // Peso mais recente do historico (por data) -> vira o peso atual do perfil.
    $ultimo = $pdo->prepare(
        'SELECT peso_kg FROM medicoes WHERE usuario_id = ? ORDER BY data DESC, id DESC LIMIT 1'
    );
    $ultimo->execute([$uid]);
    $pesoAtual = (float) $ultimo->fetchColumn();

    // Recalcula as metas com o peso atual, se o perfil estiver completo.
    $perfil = $pdo->prepare(
        'SELECT sexo, idade, altura_cm, atividade, meta, objetivo, meta_kcal
         FROM usuarios WHERE id = ?'
    );
    $perfil->execute([$uid]);
    $u = $perfil->fetch();

    $metas = null;
    $completo = $u
        && $u['meta_kcal'] !== null
        && isset(FATOR_ATIVIDADE[$u['atividade']])
        && isset(AJUSTE_META[$u['meta']]);

    if ($completo) {
        $sexo  = $u['sexo'];
        $idade = (int) $u['idade'];
        $alt   = (int) $u['altura_cm'];
        // Mifflin-St Jeor x fator de atividade x ajuste da meta.
        $tmb      = 10 * $pesoAtual + 6.25 * $alt - 5 * $idade + ($sexo === 'M' ? 5 : -161);
        $tdee     = $tmb * FATOR_ATIVIDADE[$u['atividade']];
        $metaKcal = (int) round($tdee * (1 + AJUSTE_META[$u['meta']]));
        // macros (carbo 4, proteina 4, gordura 9). Definir usa mais proteina (40/35/25).
        $divisao = ($u['objetivo'] === 'definir')
            ? ['carbo' => 0.40, 'proteina' => 0.35, 'gordura' => 0.25]
            : ['carbo' => 0.50, 'proteina' => 0.20, 'gordura' => 0.30];
        $metaCarbo    = (int) round(($metaKcal * $divisao['carbo'])    / 4);
        $metaProteina = (int) round(($metaKcal * $divisao['proteina']) / 4);
        $metaGordura  = (int) round(($metaKcal * $divisao['gordura'])  / 9);

        $upd = $pdo->prepare(
            'UPDATE usuarios SET peso_kg = ?, meta_kcal = ?, meta_carbo = ?, meta_proteina = ?, meta_gordura = ?
             WHERE id = ?'
        );
        $upd->execute([$pesoAtual, $metaKcal, $metaCarbo, $metaProteina, $metaGordura, $uid]);

        $metas = [
            'metaKcal'     => $metaKcal,
            'metaCarbo'    => $metaCarbo,
            'metaProteina' => $metaProteina,
            'metaGordura'  => $metaGordura,
        ];
    } else {
        // Perfil incompleto: guarda o peso atual sem mexer nas metas.
        $upd = $pdo->prepare('UPDATE usuarios SET peso_kg = ? WHERE id = ?');
        $upd->execute([$pesoAtual, $uid]);
    }

    responder([
        'ok'      => true,
        'medicao' => [
            'data'       => $data,
            'peso_kg'    => $peso,
            'cintura_cm' => $cintura,
        ],
        'pesoAtual' => $pesoAtual,
        'metas'     => $metas,
    ]);
} catch (Throwable $e) {
    responder(['erro' => 'Falha ao salvar a medicao.'], 500);
}
