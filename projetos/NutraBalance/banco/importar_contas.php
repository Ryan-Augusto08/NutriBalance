<?php
/**
 * NutraBalance — importa as contas geradas pelo exportar_contas.php.
 *
 * Como rodar (a partir da pasta banco/, com o MySQL ligado):
 *   php importar_contas.php                   le banco/contas_exportadas.json
 *   php importar_contas.php outro_arquivo.json
 *
 * POR QUE CASAR PELO E-MAIL, E NAO PELO ID
 * O id e numerado por cada banco na ordem de cadastro. A mesma pessoa pode ser
 * id 1 na maquina principal e id 2 no notebook — e o id 1 do notebook pode ser
 * outra conta. Copiar com o id original sobrescreveria a pessoa errada. O
 * e-mail e UNIQUE na tabela e identifica a pessoa nos dois bancos.
 *
 * O que acontece com cada conta do arquivo:
 *   - e-mail nao existe aqui: a conta e criada;
 *   - e-mail ja existe: perfil, senha e medicoes sao SUBSTITUIDOS pelos do
 *     arquivo. O id local e mantido.
 * Antes de gravar, o script mostra o que vai fazer e pede confirmacao. Tudo
 * roda numa transacao: se algo falhar no meio, nada fica pela metade.
 */

declare(strict_types=1);

require __DIR__ . '/../site/api/conexao.php';

const PASTA_SITE = __DIR__ . '/../site/';

// Mesma lista do exportar_contas.php (sem o id).
const COLUNAS_USUARIO = [
    'nome', 'email', 'senha_hash', 'foto', 'sexo', 'idade', 'altura_cm', 'peso_kg',
    'cintura_cm', 'peso_alvo', 'atividade', 'meta', 'objetivo',
    'meta_kcal', 'meta_carbo', 'meta_proteina', 'meta_gordura', 'criado_em',
];

$arquivo = $argv[1] ?? __DIR__ . '/contas_exportadas.json';

try {
    if (!is_file($arquivo)) {
        throw new RuntimeException("Arquivo nao encontrado: {$arquivo}");
    }
    $dados = json_decode((string) file_get_contents($arquivo), true, 512, JSON_THROW_ON_ERROR);
    if (($dados['formato'] ?? null) !== 1 || !is_array($dados['contas'] ?? null)) {
        throw new RuntimeException('O arquivo nao parece ter sido gerado pelo exportar_contas.php.');
    }

    $pdo = conectar();
    $buscar = $pdo->prepare(
        'SELECT u.id, COUNT(m.id) AS medicoes FROM usuarios u
           LEFT JOIN medicoes m ON m.usuario_id = u.id
          WHERE u.email = ? GROUP BY u.id'
    );

    // --- Mostra o plano antes de mexer em qualquer coisa ------------------
    echo "Arquivo: " . basename($arquivo) . " (gerado em {$dados['gerado_em']}, origem {$dados['origem']})\n";
    echo "Destino: " . DB_HOST . '/' . DB_NAME . "\n\n";

    $existentes = [];
    foreach ($dados['contas'] as $conta) {
        $buscar->execute([$conta['email']]);
        $local = $buscar->fetch();
        $existentes[$conta['email']] = $local ? (int) $local['id'] : null;

        $qtd = count($conta['medicoes']);
        if ($local) {
            printf("  %-35s SUBSTITUI a conta daqui (%d medicoes -> %d)\n", $conta['email'], $local['medicoes'], $qtd);
        } else {
            printf("  %-35s nova (%d medicoes)\n", $conta['email'], $qtd);
        }
    }

    echo "\nDigite s e Enter para continuar: ";
    if (strtolower(trim((string) fgets(STDIN))) !== 's') {
        echo "Cancelado. Nada foi alterado.\n";
        exit(0);
    }

    // --- Grava ------------------------------------------------------------
    $pdo->beginTransaction();

    $lista        = implode(', ', COLUNAS_USUARIO);
    $marcadores   = implode(', ', array_fill(0, count(COLUNAS_USUARIO), '?'));
    $atribuicoes  = implode(', ', array_map(fn ($c) => "{$c} = ?", COLUNAS_USUARIO));
    $inserirConta = $pdo->prepare("INSERT INTO usuarios ({$lista}) VALUES ({$marcadores})");
    $atualizar    = $pdo->prepare("UPDATE usuarios SET {$atribuicoes} WHERE id = ?");
    $limparMed    = $pdo->prepare('DELETE FROM medicoes WHERE usuario_id = ?');
    $inserirMed   = $pdo->prepare(
        'INSERT INTO medicoes (usuario_id, data, peso_kg, cintura_cm, criado_em) VALUES (?, ?, ?, ?, ?)'
    );

    $fotosLimpas = [];
    foreach ($dados['contas'] as $conta) {
        // A foto e so um caminho; o arquivo nao viaja junto. Sem o arquivo
        // aqui, o campo e limpo para o site mostrar o avatar padrao em vez de
        // uma imagem quebrada.
        if ($conta['foto'] !== null && !is_file(PASTA_SITE . $conta['foto'])) {
            $conta['foto'] = null;
            $fotosLimpas[] = $conta['email'];
        }

        $valores = array_map(fn ($c) => $conta[$c] ?? null, COLUNAS_USUARIO);
        $id = $existentes[$conta['email']];

        if ($id === null) {
            $inserirConta->execute($valores);
            $id = (int) $pdo->lastInsertId();
        } else {
            $atualizar->execute([...$valores, $id]);
            $limparMed->execute([$id]);
        }

        foreach ($conta['medicoes'] as $m) {
            $inserirMed->execute([$id, $m['data'], $m['peso_kg'], $m['cintura_cm'], $m['criado_em']]);
        }
    }

    $pdo->commit();

    echo "\nPronto. " . count($dados['contas']) . " conta(s) importada(s).\n";
    foreach ($fotosLimpas as $email) {
        echo "  {$email}: a foto nao veio junto, o perfil ficou com o avatar padrao.\n";
    }
    echo "As refeicoes nao fazem parte da importacao: elas ficam no navegador.\n";
    echo "Lembrete: apague o arquivo .json quando nao precisar mais dele.\n";
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, 'Falha ao importar: ' . $e->getMessage() . "\n");
    exit(1);
}
