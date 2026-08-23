<?php
/**
 * Salva a personalização (onboarding) do usuário logado.
 *   POST api/salvar_perfil.php  { sexo, idade, altura_cm, peso_kg, atividade, meta, peso_alvo, objetivo }
 * Valida as faixas, RECALCULA meta_kcal + macros aqui (autoridade — não confia
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
$cinturaIn  = $dados['cintura_cm'] ?? null;

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

// Cintura: opcional. Serve para semear a 1ª medição no histórico (medicoes).
$cintura = null;
if ($cinturaIn !== null && $cinturaIn !== '') {
    $cintura = (float) $cinturaIn;
    if ($cintura < 30 || $cintura > 200) {
        responder(['erro' => 'Cintura fora da faixa (30 a 200 cm).'], 422);
    }
}

// Mifflin-St Jeor × fator de atividade × ajuste da meta
$tmb      = 10 * $peso + 6.25 * $altura - 5 * $idade + ($sexo === 'M' ? 5 : -161);
$tdee     = $tmb * FATOR_ATIVIDADE[$atividade];
$metaKcal = (int) round($tdee * (1 + AJUSTE_META[$meta]));

// macros (carbo 4 kcal/g, proteína 4, gordura 9). Definir usa mais proteína (40/35/25).
$divisao = $objetivo === 'definir'
    ? ['carbo' => 0.40, 'proteina' => 0.35, 'gordura' => 0.25]
    : ['carbo' => 0.50, 'proteina' => 0.20, 'gordura' => 0.30];
$metaCarbo    = (int) round(($metaKcal * $divisao['carbo'])    / 4);
$metaProteina = (int) round(($metaKcal * $divisao['proteina']) / 4);
$metaGordura  = (int) round(($metaKcal * $divisao['gordura'])  / 9);

try {
    $pdo  = conectar();
    // cintura_cm: COALESCE preserva a cintura já gravada quando o onboarding
    // não informa uma nova (não sobrescreve com NULL).
    $stmt = $pdo->prepare(
        'UPDATE usuarios SET
            sexo = ?, idade = ?, altura_cm = ?, peso_kg = ?,
            cintura_cm = COALESCE(?, cintura_cm), peso_alvo = ?,
            atividade = ?, meta = ?, objetivo = ?,
            meta_kcal = ?, meta_carbo = ?, meta_proteina = ?, meta_gordura = ?
         WHERE id = ?'
    );
    $stmt->execute([
        $sexo, $idade, $altura, $peso, $cintura, $pesoAlvo, $atividade, $meta, $objetivo,
        $metaKcal, $metaCarbo, $metaProteina, $metaGordura,
        $uid,
    ]);

    // Semeia (ou atualiza) a medição de HOJE no histórico com o peso e, se
    // informada, a cintura. Assim o gráfico de Progresso já começa com um ponto.
    // COALESCE preserva uma cintura já registrada hoje quando o onboarding
    // não informa cintura (não sobrescreve com NULL).
    // Isolado num try próprio: se a tabela `medicoes` ainda não foi criada
    // (07_medicoes.sql), o onboarding continua funcionando normalmente.
    try {
        $med = $pdo->prepare(
            'INSERT INTO medicoes (usuario_id, data, peso_kg, cintura_cm)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                peso_kg = VALUES(peso_kg),
                cintura_cm = COALESCE(VALUES(cintura_cm), cintura_cm)'
        );
        $med->execute([$uid, date('Y-m-d'), $peso, $cintura]);
    } catch (Throwable $e) {
        // Sem histórico ainda — segue sem semear a medição.
    }

    responder([
        'ok'           => true,
        'metaKcal'     => $metaKcal,
        'metaCarbo'    => $metaCarbo,
        'metaProteina' => $metaProteina,
        'metaGordura'  => $metaGordura,
    ]);
} catch (Throwable $e) {
    falhar($e, 'Falha ao salvar o perfil.');
}
