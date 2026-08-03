<?php
/**
 * Conexao com o banco MySQL do NutriBalance.
 * Retorna uma instancia PDO ja configurada em UTF-8.
 *
 * Credenciais padrao do XAMPP: usuario root, sem senha.
 * Se voce definir uma senha para o root, ajuste $DB_PASS.
 */

const DB_HOST = '127.0.0.1';
const DB_PORT = 3306;
const DB_NAME = 'nutribalance';
const DB_USER = 'root';
const DB_PASS = '';

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
