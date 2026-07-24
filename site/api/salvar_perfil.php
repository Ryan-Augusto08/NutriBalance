<?php
/**
 * Salva a personalização (onboarding) do usuário logado.
 *   POST api/salvar_perfil.php  { sexo, idade, altura_cm, peso_kg, atividade, meta, peso_alvo, objetivo }
 * Valida as faixas, RECALCULA goal_kcal + macros aqui (autoridade — não confia
 * no valor que o front mandou) e faz UPDATE. Espelha o js/calculo.js.
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
$sexo      = $dados['sexo'] ?? '';
$idade     = (int)   ($dados['idade'] ?? 0);
$altura    = (int)   ($dados['altura_cm'] ?? 0);
$peso      = (float) ($dados['peso_kg'] ?? 0);
$atividade = $dados['atividade'] ?? '';
$meta      = $dados['meta'] ?? '';
$pesoAlvoIn = $dados['peso_alvo'] ?? null;
$objetivoIn = $dados['objetivo'] ?? 'manter';

// validação de faixas
if ($sexo !== 'M' && $sexo !== 'F') {
    responder(['erro' => 'Selecione o sexo.'], 422);
}
if ($idade < 10 || $idade > 120) {
    responder(['erro' => 'Idade fora da faixa (10 a 120).'], 422);
}
if ($altura < 100 || $altura > 250) {
    responder(['erro' => 'Altura fora da faixa (100 a 250 cm).'], 422);
}
if ($peso < 30 || $peso > 350) {
    responder(['erro' => 'Peso fora da faixa (30 a 350 kg).'], 422);
}
if (!isset(FATOR_ATIVIDADE[$atividade])) {
    responder(['erro' => 'Nível de atividade inválido.'], 422);
}
if (!isset(AJUSTE_META[$meta])) {
    responder(['erro' => 'Meta inválida.'], 422);
}

// Peso desejado: faz sentido quando a meta é "perder" ou "ganhar". Em "manter", grava NULL.
$pesoAlvo = null;
if (($meta === 'perder' || $meta === 'ganhar') && $pesoAlvoIn !== null && $pesoAlvoIn !== '') {
    $pesoAlvo = (float) $pesoAlvoIn;
    if ($pesoAlvo < 30 || $pesoAlvo > 350) {
        responder(['erro' => 'Peso desejado fora da faixa (30 a 350 kg).'], 422);
    }
    if ($meta === 'perder' && $pesoAlvo >= $peso) {
        responder(['erro' => 'O peso desejado deve ser menor que o peso atual.'], 422);
    }
    if ($meta === 'ganhar' && $pesoAlvo <= $peso) {
        responder(['erro' => 'O peso desejado deve ser maior que o peso atual.'], 422);
    }
}

// Objetivo: só vale para a meta "manter" (recomposição). Nas outras, grava 'manter'.
$objetivo = ($meta === 'manter' && $objetivoIn === 'definir') ? 'definir' : 'manter';

// Mifflin-St Jeor × fator de atividade × ajuste da meta
$bmr      = 10 * $peso + 6.25 * $altura - 5 * $idade + ($sexo === 'M' ? 5 : -161);
$tdee     = $bmr * FATOR_ATIVIDADE[$atividade];
$goalKcal = (int) round($tdee * (1 + AJUSTE_META[$meta]));

// macros (carbo 4 kcal/g, proteína 4, gordura 9). Definir usa mais proteína (40/35/25).
$split = $objetivo === 'definir'
    ? ['carbo' => 0.40, 'proteina' => 0.35, 'gordura' => 0.25]
    : ['carbo' => 0.50, 'proteina' => 0.20, 'gordura' => 0.30];
$goalCarbo    = (int) round(($goalKcal * $split['carbo'])    / 4);
$goalProteina = (int) round(($goalKcal * $split['proteina']) / 4);
$goalGordura  = (int) round(($goalKcal * $split['gordura'])  / 9);

try {
    $pdo  = conectar();
    $stmt = $pdo->prepare(
        'UPDATE usuarios SET
            sexo = ?, idade = ?, altura_cm = ?, peso_kg = ?, peso_alvo = ?,
            atividade = ?, meta = ?, objetivo = ?,
            goal_kcal = ?, goal_carbo = ?, goal_proteina = ?, goal_gordura = ?
         WHERE id = ?'
    );
    $stmt->execute([
        $sexo, $idade, $altura, $peso, $pesoAlvo, $atividade, $meta, $objetivo,
        $goalKcal, $goalCarbo, $goalProteina, $goalGordura,
        $uid,
    ]);

    responder([
        'ok'           => true,
        'goalKcal'     => $goalKcal,
        'goalCarbo'    => $goalCarbo,
        'goalProteina' => $goalProteina,
        'goalGordura'  => $goalGordura,
    ]);
} catch (Throwable $e) {
    responder(['erro' => 'Falha ao salvar o perfil.'], 500);
}
