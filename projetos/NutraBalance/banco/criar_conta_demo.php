<?php
/**
 * NutraBalance — cria a conta de demonstracao usada na amostra tecnica.
 *
 * Sugestao da banca: ter um login ja com historico, para mostrar o grafico de
 * Progresso funcionando sem precisar registrar meses de medicoes na hora.
 *
 *   E-mail: demo@nutrabalance.com
 *   Senha:  demo123
 *
 * A conta vem com o perfil completo e cerca de 14 meses de medicoes de peso
 * e cintura, com datas contadas a partir de HOJE — assim todos os periodos do
 * grafico (7 dias, 1 mes, 3 meses, 1 ano, Tudo) sempre tem pontos, em qualquer
 * dia em que o script for rodado.
 *
 * As refeicoes nao entram aqui: elas moram no localStorage do navegador, nao
 * no banco. Na apresentacao, sao lancadas ao vivo.
 *
 * Rodar de novo e seguro: a conta demo e apagada e recriada do zero (o
 * ON DELETE CASCADE da tabela medicoes leva junto o historico antigo). Nenhuma
 * outra conta e tocada.
 *
 * Como rodar (a partir da pasta banco/, com o MySQL ligado):
 *   D:\Xampp\php\php.exe criar_conta_demo.php
 *
 * Para criar a conta no banco do Railway, defina antes as variaveis DB_HOST,
 * DB_PORT, DB_NAME, DB_USER e DB_PASS no terminal — o conexao.php as le.
 */

declare(strict_types=1);

// As credenciais do banco vivem em um lugar so: site/api/conexao.php.
require __DIR__ . '/../site/api/conexao.php';

/* ----------------- configuracao ----------------- */

const EMAIL_DEMO = 'demo@nutrabalance.com';
const SENHA_DEMO = 'demo123';
const NOME_DEMO  = 'Conta Demonstração';

// Perfil: homem de 30 anos, 1,78 m, atividade moderada, querendo perder peso.
const PERFIL_DEMO = [
    'sexo'      => 'M',
    'idade'     => 30,
    'altura_cm' => 178,
    'peso_alvo' => 80.0,
    'atividade' => 'moderado',
    'meta'      => 'perder',
];

const PESO_INICIAL    = 98.0;  // kg, ha pouco mais de um ano
const PESO_FINAL      = 85.6;  // kg, hoje
const CINTURA_INICIAL = 106.0; // cm
const CINTURA_FINAL   = 95.5;  // cm
const DIAS_HISTORICO  = 427; // 61 semanas: passa de um ano, para "1 ano" e "Tudo" mostrarem recortes diferentes

/* ----------------- historico de medicoes ----------------- */

/**
 * Dias (contados para tras a partir de hoje) em que houve medicao. A
 * frequencia aumenta perto de hoje, para cada filtro do grafico ter pontos
 * suficientes: uma por semana no passado, a cada tres dias no ultimo mes
 * (filtro "1 mes") e todos os dias da ultima semana (filtro "7 dias").
 */
function diasComMedicao(): array
{
    $dias = [];
    for ($d = DIAS_HISTORICO; $d > 30; $d -= 7) {
        $dias[] = $d;
    }
    for ($d = 30; $d > 7; $d -= 3) {
        $dias[] = $d;
    }
    for ($d = 7; $d >= 0; $d--) {
        $dias[] = $d;
    }
    return $dias;
}

/**
 * Peso e cintura de um dia. A perda segue uma curva que desacelera com o
 * tempo (mais rapida no comeco, como acontece de fato) e ganha uma oscilacao
 * pequena e fixa — retencao de liquido, horario da pesagem —, para o grafico
 * nao parecer uma reta artificial. A oscilacao usa seno, e nao numero
 * aleatorio, para o script gerar sempre o mesmo historico.
 */
function medicaoDoDia(int $diasAtras): array
{
    $progresso = 1 - $diasAtras / DIAS_HISTORICO;      // 0 no inicio, 1 hoje
    $curva     = 1 - (1 - $progresso) ** 1.6;          // desacelera no fim
    $oscilacao = 0.35 * sin($diasAtras * 0.9) + 0.15 * sin($diasAtras * 2.3);

    $peso = PESO_INICIAL + (PESO_FINAL - PESO_INICIAL) * $curva;
    if ($diasAtras > 0) {
        $peso += $oscilacao; // hoje fica exatamente no PESO_FINAL
    }

    // Cintura (campo opcional). A densidade sobe conforme se aproxima de hoje,
    // e cada faixa existe para um filtro do grafico:
    //   a cada 14 dias no passado  -> "1 ano" e "Tudo"
    //   a cada 6 dias no ultimo mes -> "1 mes" e "3 meses"
    //   a cada 2 dias na ultima semana -> "7 dias"
    //
    // A ultima faixa foi acrescentada em 30/09/2026: sem ela a cintura tinha
    // UM unico ponto no filtro "7 dias" (so o de hoje), e o grafico nao
    // desenhava linha nenhuma — justamente o que a conta demo existe para
    // evitar.
    $cintura = null;
    $temCintura = $diasAtras === 0
        || ($diasAtras > 30 && $diasAtras % 14 === 0)
        || ($diasAtras > 7 && $diasAtras <= 30 && $diasAtras % 6 === 0)
        || ($diasAtras <= 7 && $diasAtras % 2 === 0);
    if ($temCintura) {
        $cintura = round(CINTURA_INICIAL + (CINTURA_FINAL - CINTURA_INICIAL) * $curva, 1);
    }

    return ['peso' => round($peso, 1), 'cintura' => $cintura];
}

/* ----------------- metas ----------------- */

/**
 * Meta de kcal e macros para o peso atual.
 *
 * COPIA da formula de site/api/salvar_medicao.php e salvar_perfil.php
 * (Mifflin-St Jeor x fator de atividade x ajuste da meta; divisao 50/20/30).
 * Se a formula mudar la, mudar aqui tambem.
 */
function calcularMetas(float $peso): array
{
    $fatorAtividade = ['sedentario' => 1.2, 'leve' => 1.375, 'moderado' => 1.55, 'intenso' => 1.725, 'muito_intenso' => 1.9];
    $ajusteMeta     = ['perder' => -0.15, 'manter' => 0.0, 'ganhar' => 0.15];
    $p = PERFIL_DEMO;

    $tmb      = 10 * $peso + 6.25 * $p['altura_cm'] - 5 * $p['idade'] + ($p['sexo'] === 'M' ? 5 : -161);
    $tdee     = $tmb * $fatorAtividade[$p['atividade']];
    $metaKcal = (int) round($tdee * (1 + $ajusteMeta[$p['meta']]));

    return [
        'meta_kcal'     => $metaKcal,
        'meta_carbo'    => (int) round(($metaKcal * 0.50) / 4),
        'meta_proteina' => (int) round(($metaKcal * 0.20) / 4),
        'meta_gordura'  => (int) round(($metaKcal * 0.30) / 9),
    ];
}

/* ----------------- execucao ----------------- */

try {
    $pdo = conectar();
    $pdo->beginTransaction();

    // Recomeca do zero: apaga a conta demo anterior (medicoes vao junto).
    $pdo->prepare('DELETE FROM usuarios WHERE email = ?')->execute([EMAIL_DEMO]);

    $hoje   = new DateTimeImmutable('today');
    $atual  = medicaoDoDia(0);
    $metas  = calcularMetas($atual['peso']);
    $perfil = PERFIL_DEMO;

    $pdo->prepare(
        'INSERT INTO usuarios
           (nome, email, senha_hash, sexo, idade, altura_cm, peso_kg, cintura_cm, peso_alvo,
            atividade, meta, objetivo, meta_kcal, meta_carbo, meta_proteina, meta_gordura)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)'
    )->execute([
        NOME_DEMO, EMAIL_DEMO, password_hash(SENHA_DEMO, PASSWORD_DEFAULT),
        $perfil['sexo'], $perfil['idade'], $perfil['altura_cm'], $atual['peso'], $atual['cintura'],
        $perfil['peso_alvo'], $perfil['atividade'], $perfil['meta'],
        $metas['meta_kcal'], $metas['meta_carbo'], $metas['meta_proteina'], $metas['meta_gordura'],
    ]);
    $idUsuario = (int) $pdo->lastInsertId();

    $inserir = $pdo->prepare(
        'INSERT INTO medicoes (usuario_id, data, peso_kg, cintura_cm) VALUES (?, ?, ?, ?)'
    );
    $dias = diasComMedicao();
    foreach ($dias as $diasAtras) {
        $m    = medicaoDoDia($diasAtras);
        $data = $hoje->modify("-{$diasAtras} days")->format('Y-m-d');
        $inserir->execute([$idUsuario, $data, $m['peso'], $m['cintura']]);
    }

    $pdo->commit();

    echo "Conta de demonstracao criada.\n";
    echo '  E-mail:     ' . EMAIL_DEMO . "\n";
    echo '  Senha:      ' . SENHA_DEMO . "\n";
    echo '  Medicoes:   ' . count($dias) . " (de {$hoje->modify('-' . DIAS_HISTORICO . ' days')->format('d/m/Y')} ate hoje)\n";
    echo "  Peso atual: {$atual['peso']} kg — meta de {$metas['meta_kcal']} kcal/dia\n";
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, 'Falha ao criar a conta demo: ' . $e->getMessage() . "\n");
    exit(1);
}
