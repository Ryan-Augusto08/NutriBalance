<?php
/**
 * Conexao com o banco MySQL do NutriBalance.
 * Retorna uma instancia PDO ja configurada em UTF-8.
 *
 * As credenciais vem de variavel de ambiente. Quando nenhuma esta definida,
 * o codigo cai nos valores padrao do XAMPP (root, sem senha, banco local) —
 * entao o site continua abrindo em http://localhost/nutribalance sem precisar
 * configurar nada na maquina de desenvolvimento.
 *
 * No servidor e o painel da hospedagem que preenche essas variaveis. E o que
 * permite a senha do banco de producao nunca existir dentro de um arquivo
 * versionado: ela mora so la, e o Git nunca ve.
 */

/**
 * Devolve a primeira variavel de ambiente preenchida da lista, ou o padrao.
 *
 * Aceita mais de um nome porque cada hospedagem batiza as suas do seu jeito.
 * O Railway, ao provisionar o MySQL, cria sozinho MYSQLHOST, MYSQLUSER e
 * companhia; aceitando os dois conjuntos, o deploy funciona tanto com essas
 * variaveis automaticas quanto com as DB_* definidas a mao.
 */
function env_primeira(array $nomes, string $padrao): string
{
    foreach ($nomes as $nome) {
        $valor = getenv($nome);
        // Variavel existente porem vazia conta como ausente: e o que acontece
        // quando o campo e criado no painel e deixado em branco.
        if ($valor !== false && $valor !== '') {
            return $valor;
        }
    }

    return $padrao;
}

define('DB_HOST', env_primeira(['DB_HOST', 'MYSQLHOST'], '127.0.0.1'));
define('DB_PORT', (int) env_primeira(['DB_PORT', 'MYSQLPORT'], '3306'));
define('DB_NAME', env_primeira(['DB_NAME', 'MYSQLDATABASE'], 'nutribalance'));
define('DB_USER', env_primeira(['DB_USER', 'MYSQLUSER'], 'root'));
define('DB_PASS', env_primeira(['DB_PASS', 'MYSQLPASSWORD'], ''));

function conectar(): PDO
{
    // DSN = o "endereco" do banco. Diz o driver (mysql), a maquina, a porta,
    // qual banco abrir e em que codificacao conversar. O utf8mb4 e o que
    // permite acento e emoji sem virar caractere estranho.
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';

    return new PDO($dsn, DB_USER, DB_PASS, [
        // Erro de SQL vira excecao (try/catch) em vez de um false silencioso
        // que o codigo seguiria usando sem perceber.
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,

        // fetch() devolve array so com os nomes das colunas ($u['nome']).
        // O padrao do PDO traria tambem copias numeradas ($u[0]), inuteis aqui.
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,

        // O MySQL prepara a consulta de verdade, em vez de o PHP simular
        // montando a string antes de enviar. E a diferenca que faz o prepared
        // statement proteger contra SQL Injection de fato — com a emulacao
        // ligada, quem monta o SQL final ainda e o PHP.
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
}
