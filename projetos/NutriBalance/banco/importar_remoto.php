<?php
/**
 * Importa o nutribalance_completo.sql num MySQL hospedado (Railway).
 *
 * Como usar, com o terminal nesta pasta:
 *
 *     D:\Xampp\php\php.exe importar_remoto.php
 *
 * Ele pede a URL de conexao, importa o arquivo e confere o resultado.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * O caminho obvio seria o cliente de linha de comando do XAMPP:
 *
 *     mysql.exe -h servidor -u root -p... < nutribalance_completo.sql
 *
 * So que o cliente que vem no XAMPP e o do MariaDB, e o banco do Railway e
 * MySQL 8. O MySQL 8 autentica com o plugin `caching_sha2_password`, que o
 * cliente MariaDB nao implementa — a conexao morre com
 * "ERROR 1045: Plugin caching_sha2_password could not be loaded", que parece
 * senha errada mas nao e.
 *
 * O PHP nao tem essa limitacao: o driver mysqlnd suporta esse plugin desde o
 * PHP 7.4. Como o XAMPP ja traz PHP 8.2, da para importar sem instalar nada.
 *
 * A URL nunca e gravada em disco: ela e digitada na hora e vive so na memoria
 * do processo. Assim a senha do banco nao acaba num arquivo por descuido.
 */

declare(strict_types=1);

$arquivo = __DIR__ . '/nutribalance_completo.sql';

if (!is_file($arquivo)) {
    fwrite(STDERR, "Arquivo nao encontrado: {$arquivo}\n");
    exit(1);
}

echo "Importador do NutriBalance\n";
echo "Arquivo: " . basename($arquivo) . ' (' . number_format(filesize($arquivo) / 1024, 0) . " KB)\n\n";
echo "Cole a MYSQL_PUBLIC_URL do Railway e tecle Enter:\n> ";

$url = trim((string) fgets(STDIN));

// parse_url separa a URL nos pedacos certos sozinho — mais confiavel do que
// montar uma expressao regular a mao, principalmente porque a senha pode
// conter caracteres que confundiriam o padrao.
$partes = parse_url($url);

if ($partes === false || !isset($partes['host'], $partes['user'], $partes['pass'])) {
    fwrite(STDERR, "\nURL nao reconhecida. Ela deve ter o formato:\n");
    fwrite(STDERR, "  mysql://usuario:senha@servidor.proxy.rlwy.net:12345/railway\n");
    fwrite(STDERR, "Confira se copiou a MYSQL_PUBLIC_URL inteira (nao a MYSQL_URL).\n");
    exit(1);
}

$servidor = $partes['host'];
$porta    = (int) ($partes['port'] ?? 3306);
$usuario  = $partes['user'];
// A senha viaja codificada dentro da URL: um "@" aparece como %40. Sem
// decodificar, a autenticacao falharia com uma senha silenciosamente errada.
$senha    = rawurldecode($partes['pass']);

echo "\nConectando em {$servidor}:{$porta} como {$usuario}...\n";

// Faz o mysqli lancar excecao em vez de devolver false e seguir adiante.
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Sem banco no quinto argumento de proposito: o proprio arquivo .sql faz
    // o CREATE DATABASE e o USE. Escolher um banco aqui seria redundante e
    // falharia, porque o `nutribalance` ainda nao existe na primeira execucao.
    $con = new mysqli($servidor, $usuario, $senha, '', $porta);
    $con->set_charset('utf8mb4');

    echo "Conectado. Servidor: " . $con->server_info . "\n";
    echo "Importando...\n";

    $sql = file_get_contents($arquivo);
    if ($sql === false) {
        throw new RuntimeException('Nao foi possivel ler o arquivo .sql.');
    }

    // multi_query envia o arquivo inteiro de uma vez. O laco abaixo e
    // obrigatorio: o MySQL devolve um resultado por comando executado, e
    // deixar de consumi-los derruba a conexao com "commands out of sync".
    $con->multi_query($sql);

    $comandos = 0;
    do {
        $resultado = $con->store_result();
        if ($resultado instanceof mysqli_result) {
            $resultado->free();
        }
        $comandos++;
    } while ($con->more_results() && $con->next_result());

    echo "Pronto. {$comandos} comandos executados.\n\n";

    // --- Conferencia ---------------------------------------------------
    $con->select_db('nutribalance');

    echo "Conferindo o resultado:\n";
    foreach (['alimentos', 'usuarios', 'medicoes', 'redefinicoes_senha'] as $tabela) {
        $linhas = (int) $con->query("SELECT COUNT(*) FROM `{$tabela}`")->fetch_row()[0];
        printf("  %-20s %5d linhas\n", $tabela, $linhas);
    }

    echo "\nA tabela alimentos deve ter 597 linhas.\n";

    $con->close();
} catch (Throwable $e) {
    fwrite(STDERR, "\nFalhou: " . $e->getMessage() . "\n");
    exit(1);
}
