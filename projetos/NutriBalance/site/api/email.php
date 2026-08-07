<?php
/**
 * Envio de e-mail pelo SMTP do Gmail.
 *
 * Usa o PHPMailer instalado à mão em `lib/PHPMailer/` (sem Composer): são
 * só três arquivos, então basta incluí-los. A função `mail()` nativa do
 * PHP não é usada porque o XAMPP não vem com servidor de e-mail — ela
 * falha calada.
 *
 * As credenciais ficam em `email_config.php` (fora do Git). Se esse
 * arquivo não existir, `enviar_email()` devolve false em vez de derrubar
 * a página, e a causa fica registrada no log de erro do PHP.
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as ErroPHPMailer;

require_once __DIR__ . '/lib/PHPMailer/Exception.php';
require_once __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/lib/PHPMailer/SMTP.php';

$caminhoConfigEmail = __DIR__ . '/email_config.php';
if (is_file($caminhoConfigEmail)) {
    require_once $caminhoConfigEmail;
}

// No servidor esse arquivo nao existe: ele esta no .gitignore justamente para
// a senha de app nunca virar commit, entao nunca chega la. Em producao as
// mesmas chaves chegam por variavel de ambiente, definidas no painel da
// hospedagem.
//
// O `defined` antes de cada uma da a ultima palavra ao email_config.php: se o
// arquivo existe (maquina de desenvolvimento), ele ja definiu a constante e a
// variavel de ambiente e ignorada.
if (!defined('SMTP_HOST')) {
    define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.gmail.com');
}
if (!defined('SMTP_PORTA')) {
    define('SMTP_PORTA', (int) (getenv('SMTP_PORTA') ?: 587));
}
if (!defined('SMTP_USUARIO')) {
    define('SMTP_USUARIO', getenv('SMTP_USUARIO') ?: '');
}
if (!defined('SMTP_SENHA')) {
    define('SMTP_SENHA', getenv('SMTP_SENHA') ?: '');
}
if (!defined('SMTP_REMETENTE_NOME')) {
    define('SMTP_REMETENTE_NOME', getenv('SMTP_REMETENTE_NOME') ?: 'NutriBalance');
}
// Sem valor padrao: vazio faz o url_site() montar o endereco a partir da
// propria requisicao, que e o comportamento certo no XAMPP local.
if (!defined('URL_SITE')) {
    define('URL_SITE', getenv('URL_SITE') ?: '');
}

// Chave da API do Brevo. Presente = envio por HTTP; ausente = envio por SMTP.
// Ver o comentario de enviar_email() para o motivo de existirem dois caminhos.
if (!defined('BREVO_API_KEY')) {
    define('BREVO_API_KEY', getenv('BREVO_API_KEY') ?: '');
}

/**
 * true se algum dos dois caminhos de envio está utilizável.
 * Rejeita também os valores de exemplo do email_config.php, para que quem
 * esqueceu de trocá-los veja no log o motivo certo em vez de um erro de
 * autenticação do Gmail.
 */
function email_configurado(): bool
{
    // O remetente é exigido pelos dois caminhos: é o endereço que aparece
    // como "De:" na caixa de entrada de quem recebe.
    $naoPreenchidos = ['', 'seuemail@gmail.com', 'xxxx xxxx xxxx xxxx', 'COLE_AQUI_A_SENHA_DE_APP'];

    if (!defined('SMTP_USUARIO') || in_array(SMTP_USUARIO, $naoPreenchidos, true)) {
        return false;
    }

    if (BREVO_API_KEY !== '') {
        return true;
    }

    return defined('SMTP_HOST')
        && defined('SMTP_SENHA')
        && !in_array(SMTP_SENHA, $naoPreenchidos, true);
}

/**
 * Endereço público do site, sem barra no fim — base dos links enviados
 * por e-mail. Vem do email_config.php; sem ele, monta a partir da própria
 * requisição (a pasta acima de api/), que é o certo no XAMPP local.
 */
function url_site(): string
{
    if (defined('URL_SITE') && URL_SITE !== '') {
        return rtrim(URL_SITE, '/');
    }

    $protocolo = (($_SERVER['HTTPS'] ?? '') === 'on') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';

    // dirname() no Windows devolve barra invertida; normaliza para URL.
    $pastaApi = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/'));
    $raiz = str_replace('\\', '/', dirname($pastaApi));
    if ($raiz === '/' || $raiz === '.') {
        $raiz = '';
    }

    return $protocolo . '://' . $host . $raiz;
}

/**
 * Envia uma mensagem. Devolve true se o servidor aceitou.
 *
 * POR QUE EXISTEM DOIS CAMINHOS DE ENVIO
 * O envio por SMTP é o jeito clássico e funciona perfeitamente na máquina de
 * desenvolvimento. Mas a hospedagem gratuita do Railway bloqueia as portas de
 * SMTP (25, 465 e 587) para todo container — é uma proteção contra spam, e
 * vale para qualquer aplicação, não só esta. A tentativa não é recusada: ela
 * fica esperando até estourar o tempo, e o log registra "Connection timed
 * out". Nenhum ajuste de senha ou de configuração contorna isso.
 *
 * A saída é enviar por API HTTP, que trafega na porta 443 como qualquer
 * requisição web e por isso não esbarra no bloqueio. Aqui o serviço é o
 * Brevo, escolhido por dispensar domínio próprio: basta verificar um
 * endereço de remetente.
 *
 * A escolha é automática, pela presença da chave: com BREVO_API_KEY definida
 * (o servidor), vai por HTTP; sem ela (o XAMPP), vai por SMTP. Assim o
 * ambiente local continua funcionando exatamente como antes, sem precisar de
 * conta em serviço nenhum para desenvolver.
 *
 * O erro real nunca vai pro navegador (vazaria a configuração do servidor);
 * ele é gravado no log — no XAMPP, D:\Xampp\apache\logs\error.log; no
 * servidor, no painel da hospedagem.
 */
function enviar_email(string $para, string $assunto, string $corpoHtml, string $corpoTexto): bool
{
    if (!email_configurado()) {
        error_log('NutriBalance: envio de e-mail não configurado — nem BREVO_API_KEY nem SMTP preenchidos.');
        return false;
    }

    if (BREVO_API_KEY !== '') {
        return enviar_por_api($para, $assunto, $corpoHtml, $corpoTexto);
    }

    return enviar_por_smtp($para, $assunto, $corpoHtml, $corpoTexto);
}

/**
 * Envio pela API HTTP do Brevo. Usado no servidor.
 *
 * A API responde 201 quando aceita a mensagem para entrega. Qualquer outro
 * código é falha, e o corpo da resposta explica — daí ele ir para o log.
 */
function enviar_por_api(string $para, string $assunto, string $corpoHtml, string $corpoTexto): bool
{
    $carga = [
        'sender'      => ['name' => SMTP_REMETENTE_NOME, 'email' => SMTP_USUARIO],
        'to'          => [['email' => $para]],
        'subject'     => $assunto,
        'htmlContent' => $corpoHtml,
        'textContent' => $corpoTexto,
    ];

    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => [
            'api-key: ' . BREVO_API_KEY,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_POSTFIELDS     => json_encode($carga, JSON_UNESCAPED_UNICODE),
    ]);

    $resposta  = curl_exec($ch);
    $status    = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $erroDeRede = curl_error($ch);
    curl_close($ch);

    if ($status === 201) {
        return true;
    }

    if ($erroDeRede !== '') {
        error_log('NutriBalance: falha de rede ao chamar o Brevo — ' . $erroDeRede);
    } else {
        // A resposta do Brevo nomeia o problema: remetente não verificado,
        // chave inválida, cota do dia estourada.
        error_log("NutriBalance: Brevo recusou o envio (HTTP {$status}) — " . (string) $resposta);
    }

    return false;
}

/**
 * Envio por SMTP com o PHPMailer. Usado na máquina de desenvolvimento.
 */
function enviar_por_smtp(string $para, string $assunto, string $corpoHtml, string $corpoTexto): bool
{
    $mensagem = new PHPMailer(true);

    try {
        $mensagem->isSMTP();
        $mensagem->Host = SMTP_HOST;
        $mensagem->Port = SMTP_PORTA;
        $mensagem->SMTPAuth = true;
        $mensagem->Username = SMTP_USUARIO;
        // O Google mostra a senha de app em blocos de 4; os espaços não fazem parte dela.
        $mensagem->Password = str_replace(' ', '', SMTP_SENHA);
        $mensagem->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mensagem->CharSet = 'UTF-8';
        $mensagem->Timeout = 15;

        $mensagem->setFrom(SMTP_USUARIO, SMTP_REMETENTE_NOME);
        $mensagem->addAddress($para);

        $mensagem->isHTML(true);
        $mensagem->Subject = $assunto;
        $mensagem->Body = $corpoHtml;
        $mensagem->AltBody = $corpoTexto;   // versão em texto puro, para clientes sem HTML

        $mensagem->send();
        return true;
    } catch (ErroPHPMailer $e) {
        error_log('NutriBalance: falha no envio de e-mail — ' . $mensagem->ErrorInfo);
        return false;
    }
}
