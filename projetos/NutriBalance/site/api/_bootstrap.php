<?php
/**
 * Bootstrap comum aos endpoints de conta/perfil do NutriBalance.
 * Abre a sessão, define cabeçalhos JSON e helpers de resposta.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * Os dez endpoints fazem as mesmas quatro coisas antes de qualquer
 * trabalho: abrir sessão, avisar que a resposta é JSON, conferir o método
 * HTTP e saber quem está logado. Sem este arquivo, essas linhas estariam
 * copiadas dez vezes — e corrigir uma delas exigiria lembrar das outras
 * nove. Cada endpoint começa com `require __DIR__ . '/_bootstrap.php';`
 * e já nasce com tudo isso pronto.
 */

// Retoma a sessão deste visitante a partir do cookie que o navegador
// enviou (ou cria uma nova). É o que faz $_SESSION['uid'] continuar
// existindo de uma página para a outra.
session_start();

// Avisa ao navegador que o corpo da resposta é JSON, não HTML. Sem isso o
// fetch() do JavaScript ainda funciona, mas o navegador tenta exibir como
// página quando a URL é aberta direto.
header('Content-Type: application/json; charset=utf-8');

// Proíbe o navegador de guardar a resposta em cache. Estes endpoints
// devolvem dado de conta: uma resposta reaproveitada poderia mostrar o
// perfil de quem usou o computador antes.
header('Cache-Control: no-store');

// require_once, e nao require: o buscar.php inclui o conexao.php direto, sem
// passar por aqui. Como aquele arquivo declara uma funcao, incluir duas vezes
// no mesmo request seria erro fatal de redeclaracao.
require_once __DIR__ . '/conexao.php';

/**
 * Envia um JSON e encerra.
 *
 * O `exit` no fim é proposital: quem chama escreve
 * `responder(['erro' => '...'], 422);` sem precisar de `return` depois —
 * a execução para ali mesmo. É o que permite validar em cascata sem
 * aninhar vários if/else.
 *
 * JSON_UNESCAPED_UNICODE mantém "inválido" legível no corpo da resposta;
 * sem ele o PHP escreveria "inválido".
 */
function responder(array $dados, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Lê o corpo da requisição como JSON (ou cai no $_POST de formulário).
 *
 * O $_POST do PHP só é preenchido quando o navegador envia no formato de
 * formulário. Como o front manda JSON (`JSON.stringify` no fetch), o dado
 * chega no fluxo bruto `php://input` e precisa ser lido e convertido à
 * mão. O retorno para $_POST no fim mantém o endpoint funcionando também
 * por formulário HTML comum — útil para testar sem JavaScript.
 */
function corpo(): array
{
    $raw = file_get_contents('php://input');
    if ($raw !== false && $raw !== '') {
        $json = json_decode($raw, true);
        if (is_array($json)) {
            return $json;
        }
    }
    return $_POST;
}

/**
 * Registra a causa técnica no log e responde com a mensagem neutra.
 *
 * POR QUE OS DOIS TEXTOS SÃO DIFERENTES
 * A mensagem do navegador é curta e sem detalhe de propósito: a exceção real
 * carrega nome de banco, de tabela, caminho de arquivo e às vezes trecho da
 * consulta — material que só ajuda quem estiver procurando uma brecha.
 *
 * Mas descartar a exceção, que era o que estes endpoints faziam, deixa a
 * aplicação muda quando algo quebra em produção: o usuário vê "Falha ao
 * salvar" e não há onde descobrir se foi a conexão, uma coluna que não existe
 * ou permissão negada. O log do servidor é o lugar certo — ele é privado.
 *
 * No servidor, o docker/php.ini manda o log para a saída de erro do
 * container, e ele aparece no painel da hospedagem. No XAMPP, vai para
 * D:\Xampp\apache\logs\error.log.
 */
function falhar(Throwable $e, string $mensagem): void
{
    $endpoint = basename($_SERVER['SCRIPT_NAME'] ?? 'api');
    error_log("NutriBalance {$endpoint}: " . $e->getMessage());

    responder(['erro' => $mensagem], 500);
}

/** Exige método HTTP; encerra com 405 se não bater. */
function exigir_metodo(string $metodo): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $metodo) {
        responder(['erro' => 'Método não permitido.'], 405);
    }
}

/**
 * Retorna o id do usuário logado ou encerra com 401.
 *
 * Toda página protegida passa por aqui. O id vem da SESSÃO, nunca de algo
 * enviado pelo navegador: se o endpoint aceitasse `?usuario_id=7`,
 * qualquer pessoa trocaria o número na URL e leria os dados de outra
 * conta. Como o $_SESSION fica no servidor, o navegador não tem como
 * forjá-lo — só carrega o cookie com a chave da sessão.
 */
function exigir_login(): int
{
    if (empty($_SESSION['uid'])) {
        responder(['erro' => 'Não autenticado.'], 401);
    }
    return (int) $_SESSION['uid'];
}
