<?php
/**
 * NutriBalance — importador da TACO para o MySQL.
 *
 * Le a planilha oficial da TACO (.xlsx) e popula a tabela `alimentos`.
 * A planilha e um arquivo .xlsx (zip de XMLs); lemos sem biblioteca externa,
 * apenas com ZipArchive + SimpleXML.
 *
 * Como rodar (a partir da pasta banco/):
 *   D:\Xampp\php\php.exe -d extension=php_zip.dll 02_importar.php
 *
 * O -d extension=php_zip.dll liga o modulo zip so nessa execucao (nao mexe no php.ini).
 */

/* ----------------- configuracao ----------------- */
$DB_HOST = '127.0.0.1';
$DB_PORT = 3306;
$DB_USER = 'root';
$DB_PASS = '';
$DB_NAME = 'nutribalance';

$XLSX = __DIR__ . '/../dados/Taco-4a-Edicao.xlsx';
$SHEET = 'xl/worksheets/sheet1.xml'; // "CMVCol taco3" — composicao centesimal + minerais + vitaminas

/* colunas da planilha (0-index) -> coluna do banco */
$MAP = [
    3  => 'energia_kcal',
    4  => 'energia_kj',
    2  => 'umidade',
    5  => 'proteina',
    6  => 'lipideos',
    7  => 'colesterol',
    8  => 'carboidrato',
    9  => 'fibra',
    10 => 'cinzas',
    11 => 'calcio',
    12 => 'magnesio',
    14 => 'manganes',
    15 => 'fosforo',
    16 => 'ferro',
    17 => 'sodio',
    18 => 'potassio',
    19 => 'cobre',
    20 => 'zinco',
    21 => 'retinol',
    23 => 'rae',
    24 => 'tiamina',
    25 => 'riboflavina',
    26 => 'piridoxina',
    27 => 'niacina',
    28 => 'vitamina_c',
];

/* ----------------- checagens ----------------- */
if (!class_exists('ZipArchive')) {
    fwrite(STDERR, "ERRO: extensao zip nao carregada. Rode com:\n" .
        "  D:\\Xampp\\php\\php.exe -d extension=php_zip.dll " . basename(__FILE__) . "\n");
    exit(1);
}
if (!is_file($XLSX)) {
    fwrite(STDERR, "ERRO: planilha nao encontrada em $XLSX\n");
    exit(1);
}

/* ----------------- ler o xlsx ----------------- */
$zip = new ZipArchive();
if ($zip->open($XLSX) !== true) {
    fwrite(STDERR, "ERRO: nao foi possivel abrir o xlsx.\n");
    exit(1);
}

// tabela de strings compartilhadas
$shared = [];
if (($ss = $zip->getFromName('xl/sharedStrings.xml')) !== false) {
    $x = new SimpleXMLElement($ss);
    foreach ($x->si as $si) {
        $txt = '';
        if (isset($si->t) && count($si->r) === 0) {
            $txt = (string)$si->t;
        } else {
            foreach ($si->r as $r) $txt .= (string)$r->t;
        }
        $shared[] = $txt;
    }
}

$sheetXml = $zip->getFromName($SHEET);
$zip->close();
if ($sheetXml === false) {
    fwrite(STDERR, "ERRO: planilha interna $SHEET nao encontrada.\n");
    exit(1);
}
$sheet = new SimpleXMLElement($sheetXml);

function colLetter($ref) { return preg_replace('/[0-9]+/', '', $ref); }
function colIndex($letters) {
    $n = 0;
    for ($i = 0; $i < strlen($letters); $i++) $n = $n * 26 + (ord($letters[$i]) - 64);
    return $n - 1;
}

/**
 * Normaliza um valor da TACO para numero ou NULL.
 *  "NA"  -> nao disponivel  -> NULL
 *  "Tr"  -> traco           -> 0 (quantidade insignificante, mas medida)
 *  "*"   -> nao aplicavel    -> NULL
 *  ""    -> nao analisado    -> NULL
 */
function num($v) {
    $v = trim((string)$v);
    if ($v === '') return null;
    $u = mb_strtoupper($v);
    if ($u === 'NA' || $u === '*' || $u === 'N/A') return null;
    if ($u === 'TR') return 0;
    if (!is_numeric($v)) return null;
    return (float)$v;
}

/* ----------------- conectar no MySQL ----------------- */
$dsn = "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4";
try {
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (PDOException $e) {
    fwrite(STDERR, "ERRO ao conectar no MySQL: " . $e->getMessage() . "\n" .
        "Verifique se o MySQL do XAMPP esta rodando e se o banco '$DB_NAME' existe (rode 01_schema.sql).\n");
    exit(1);
}

$pdo->exec('TRUNCATE TABLE alimentos');

// monta o INSERT dinamicamente a partir do MAP
$cols = array_merge(['numero_taco', 'categoria', 'descricao'], array_values($MAP));
$placeholders = implode(', ', array_fill(0, count($cols), '?'));
$sql = 'INSERT INTO alimentos (' . implode(', ', $cols) . ") VALUES ($placeholders)";
$stmt = $pdo->prepare($sql);

/* ----------------- percorrer as linhas ----------------- */
$categoriaAtual = null;
$inseridos = 0;
$rowNum = 0;

foreach ($sheet->sheetData->row as $row) {
    $cells = [];
    foreach ($row->c as $c) {
        $ci = colIndex(colLetter((string)$c['r']));
        $t = (string)$c['t'];
        $v = (string)$c->v;
        if ($t === 's') $v = $shared[(int)$v] ?? '';
        $cells[$ci] = $v;
    }
    $rowNum++;

    // as 3 primeiras linhas sao cabecalho
    if ($rowNum <= 3) continue;

    $col0 = trim($cells[0] ?? '');
    $col1 = trim($cells[1] ?? '');

    // fragmentos do cabecalho que a TACO repete a cada quebra de pagina.
    // devem ser ignorados SEM trocar a categoria atual (senao a categoria real se perde).
    $tokensCabecalho = ['numero do', 'numero do', 'alimento', 'descricao dos alimentos'];
    $col0Norm = strtr(mb_strtolower($col0), ['ú' => 'u', 'ã' => 'a', 'ç' => 'c']);
    if (in_array($col0Norm, $tokensCabecalho, true)) continue;

    // linha de categoria: col0 tem texto (nao numerico) e col1 esta vazia
    if ($col0 !== '' && !is_numeric($col0) && $col1 === '') {
        $categoriaAtual = $col0;
        continue;
    }

    // linha de dados valida: precisa de numero e descricao
    if (!is_numeric($col0) || $col1 === '') continue;

    $valores = [(int)$col0, $categoriaAtual, $col1];
    foreach ($MAP as $ci => $_col) {
        $valores[] = num($cells[$ci] ?? '');
    }
    $stmt->execute($valores);
    $inseridos++;
}

echo "Importacao concluida: $inseridos alimentos inseridos.\n";

// pequeno resumo
$total = $pdo->query('SELECT COUNT(*) FROM alimentos')->fetchColumn();
$cats  = $pdo->query('SELECT COUNT(DISTINCT categoria) FROM alimentos')->fetchColumn();
echo "Total na tabela: $total | categorias distintas: $cats\n";
