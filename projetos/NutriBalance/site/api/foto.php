<?php
/**
 * Foto de perfil do usuário logado.
 *
 *   POST api/foto.php  (multipart/form-data, campo `foto`)  → envia/troca a foto
 *   POST api/foto.php  { "acao": "remover" }                → remove a foto atual
 *
 * As imagens ficam em site/uploads/fotos/ com nome foto_<uid>_<hash>.<ext>.
 * No banco guardamos só o caminho relativo (ex.: uploads/fotos/foto_3_ab12.jpg),
 * que o front usa direto como src. A troca apaga o arquivo anterior.
 */

require __DIR__ . '/_bootstrap.php';

exigir_metodo('POST');

$uid = exigir_login();

const PASTA_FOTOS = __DIR__ . '/../uploads/fotos/';
const TAMANHO_MAX = 3 * 1024 * 1024; // 3 MB
// mime real (via getimagesize) → extensão do arquivo salvo
const TIPOS_ACEITOS = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];

/** Caminho relativo (web) da foto atual do usuário, ou null. */
function foto_atual(PDO $pdo, int $uid): ?string
{
    $stmt = $pdo->prepare('SELECT foto FROM usuarios WHERE id = ?');
    $stmt->execute([$uid]);
    $foto = $stmt->fetchColumn();
    return $foto !== false && $foto !== null ? (string) $foto : null;
}

/** Apaga o arquivo de uma foto (caminho relativo) se ele existir dentro da pasta. */
function apagar_arquivo(?string $relativo): void
{
    if (!$relativo) {
        return;
    }
    $caminho = __DIR__ . '/../' . $relativo;
    if (is_file($caminho)) {
        @unlink($caminho);
    }
}

try {
    $pdo = conectar();

    // --- Remoção (corpo JSON { acao: "remover" }) ---
    $dados = corpo();
    if (($dados['acao'] ?? '') === 'remover') {
        apagar_arquivo(foto_atual($pdo, $uid));
        $pdo->prepare('UPDATE usuarios SET foto = NULL WHERE id = ?')->execute([$uid]);
        responder(['ok' => true, 'foto' => null]);
    }

    // --- Envio/troca (multipart, campo `foto`) ---
    if (!isset($_FILES['foto']) || $_FILES['foto']['error'] === UPLOAD_ERR_NO_FILE) {
        responder(['erro' => 'Nenhuma imagem enviada.'], 422);
    }

    $arquivo = $_FILES['foto'];

    if ($arquivo['error'] !== UPLOAD_ERR_OK) {
        // Cobre o caso do arquivo maior que o limite do PHP (upload_max_filesize).
        responder(['erro' => 'Falha no envio da imagem. Ela pode ser grande demais.'], 422);
    }
    if ($arquivo['size'] > TAMANHO_MAX) {
        responder(['erro' => 'A imagem deve ter no máximo 3 MB.'], 422);
    }

    // Valida que é mesmo uma imagem e descobre o tipo real (não confia na extensão).
    $info = @getimagesize($arquivo['tmp_name']);
    $mime = $info['mime'] ?? '';
    if (!$info || !isset(TIPOS_ACEITOS[$mime])) {
        responder(['erro' => 'Formato inválido. Use JPG, PNG ou WEBP.'], 422);
    }
    $ext = TIPOS_ACEITOS[$mime];

    if (!is_dir(PASTA_FOTOS) && !@mkdir(PASTA_FOTOS, 0755, true)) {
        responder(['erro' => 'Não foi possível salvar a imagem no servidor.'], 500);
    }

    $antiga   = foto_atual($pdo, $uid);
    $nomeArq  = 'foto_' . $uid . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
    $relativo = 'uploads/fotos/' . $nomeArq;
    $destino  = PASTA_FOTOS . $nomeArq;

    if (!move_uploaded_file($arquivo['tmp_name'], $destino)) {
        responder(['erro' => 'Não foi possível salvar a imagem no servidor.'], 500);
    }

    $pdo->prepare('UPDATE usuarios SET foto = ? WHERE id = ?')->execute([$relativo, $uid]);

    // Só apaga a anterior depois que a nova já está gravada.
    if ($antiga !== $relativo) {
        apagar_arquivo($antiga);
    }

    responder(['ok' => true, 'foto' => $relativo]);
} catch (Throwable $e) {
    falhar($e, 'Falha ao atualizar a foto.');
}
