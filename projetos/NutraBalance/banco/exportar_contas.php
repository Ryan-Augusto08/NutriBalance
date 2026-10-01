<?php
/**
 * NutraBalance — exporta contas (perfil + medicoes) para levar a outra maquina.
 *
 * O banco de cada maquina mora dentro do MySQL dela (xampp\mysql\data), fora
 * da pasta do projeto. Copiar a pasta ou clonar o GitHub leva o site, mas nao
 * quem se cadastrou. Este script tira as contas do banco e grava num arquivo
 * que viaja; o importar_contas.php poe de volta do outro lado.
 *
 * Como rodar (a partir da pasta banco/, com o MySQL ligado):
 *   php exportar_contas.php                      todas, menos a conta demo
 *   php exportar_contas.php voce@email.com ...   so os e-mails informados
 *
 * Gera banco/contas_exportadas.json.
 *
 * CUIDADO: o arquivo tem e-mail e hash de senha. Ele esta no .gitignore (o
 * repositorio e publico) e deve viajar como o email_config.php: pendrive ou
 * zip, nunca commit. Apagar depois de importar.
 *
 * Nao vao junto:
 *   - refeicoes: moram no localStorage do navegador, nao no banco;
 *   - arquivo da foto: fica em site/uploads/fotos/. So o caminho vai; se a
 *     foto nao existir na outra maquina, o importador limpa o campo;
 *   - pedidos de redefinicao de senha: sao temporarios, nao faz sentido levar.
 */

declare(strict_types=1);

// As credenciais do banco vivem em um lugar so: site/api/conexao.php.
require __DIR__ . '/../site/api/conexao.php';

const ARQUIVO_SAIDA = __DIR__ . '/contas_exportadas.json';
const EMAIL_DEMO    = 'demo@nutrabalance.com';

// Tudo da tabela usuarios menos o id: o id e do banco de origem e nao vale
// no destino, onde a conta e encontrada pelo e-mail.
const COLUNAS_USUARIO = [
    'nome', 'email', 'senha_hash', 'foto', 'sexo', 'idade', 'altura_cm', 'peso_kg',
    'cintura_cm', 'peso_alvo', 'atividade', 'meta', 'objetivo',
    'meta_kcal', 'meta_carbo', 'meta_proteina', 'meta_gordura', 'criado_em',
];

$emails = array_slice($argv, 1);

try {
    $pdo = conectar();
    $colunas = 'id, ' . implode(', ', COLUNAS_USUARIO);

    if ($emails) {
        // Um "?" por e-mail: continua sendo prepared statement, mesmo com a
        // lista de tamanho variavel.
        $marcadores = implode(', ', array_fill(0, count($emails), '?'));
        $consulta = $pdo->prepare("SELECT {$colunas} FROM usuarios WHERE email IN ({$marcadores}) ORDER BY id");
        $consulta->execute($emails);
    } else {
        $consulta = $pdo->prepare("SELECT {$colunas} FROM usuarios WHERE email <> ? ORDER BY id");
        $consulta->execute([EMAIL_DEMO]);
    }
    $usuarios = $consulta->fetchAll();

    if (!$usuarios) {
        fwrite(STDERR, "Nenhuma conta encontrada. Nada foi gravado.\n");
        exit(1);
    }

    // Avisa e-mail pedido que nao existe, em vez de exportar calado sem ele.
    $achados = array_column($usuarios, 'email');
    foreach (array_diff($emails, $achados) as $faltando) {
        echo "Aviso: {$faltando} nao existe neste banco.\n";
    }

    $medicoes = $pdo->prepare(
        'SELECT data, peso_kg, cintura_cm, criado_em FROM medicoes WHERE usuario_id = ? ORDER BY data, id'
    );

    $contas = [];
    foreach ($usuarios as $u) {
        $medicoes->execute([$u['id']]);
        $conta = array_intersect_key($u, array_flip(COLUNAS_USUARIO));
        $conta['medicoes'] = $medicoes->fetchAll();
        $contas[] = $conta;
    }

    $saida = [
        'formato'   => 1,
        'gerado_em' => date('Y-m-d H:i:s'),
        'origem'    => gethostname() . ' / ' . DB_HOST . '/' . DB_NAME,
        'contas'    => $contas,
    ];
    $json = json_encode($saida, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    file_put_contents(ARQUIVO_SAIDA, $json);

    echo "Contas exportadas:\n";
    foreach ($contas as $c) {
        printf("  %-35s %4d medicoes\n", $c['email'], count($c['medicoes']));
    }
    echo "\nArquivo: " . ARQUIVO_SAIDA . "\n";
    echo "Tem e-mail e hash de senha: leve por pendrive, nunca por commit.\n";
} catch (Throwable $e) {
    fwrite(STDERR, 'Falha ao exportar: ' . $e->getMessage() . "\n");
    exit(1);
}
