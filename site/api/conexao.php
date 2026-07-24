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
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    return new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
}
