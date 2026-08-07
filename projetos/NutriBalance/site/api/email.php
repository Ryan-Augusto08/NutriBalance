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

/**
 * true se o email_config.php existe e está preenchido de verdade.
 * Rejeita também os valores de exemplo, para que quem esqueceu de trocá-los
 * veja no log o motivo certo em vez de um erro de autenticação do Gmail.
 */
function email_configurado(): bool
{
    if (!defined('SMTP_HOST') || !defined('SMTP_USUARIO') || !defined('SMTP_SENHA')) {
        return false;
    }
    $naoPreenchidos = ['', 'seuemail@gmail.com', 'xxxx xxxx xxxx xxxx', 'COLE_AQUI_A_SENHA_DE_APP'];

    return !in_array(SMTP_USUARIO, $naoPreenchidos, true)
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
 * Envia uma mensagem. Devolve true se o servidor SMTP aceitou.
 * O erro real nunca vai pro navegador (vazaria a configuração do servidor);
 * ele é gravado no log do PHP — no XAMPP, D:\Xampp\apache\logs\error.log.
 */
function enviar_email(string $para, string $assunto, string $corpoHtml, string $corpoTexto): bool
{
    if (!email_configurado()) {
        error_log('NutriBalance: email_config.php ausente ou não preenchido — e-mail não enviado.');
        return false;
    }

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
