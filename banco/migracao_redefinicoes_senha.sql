-- =====================================================================
-- Migracao — tabela `redefinicoes_senha`
--
-- Use este arquivo se o banco `nutribalance` JA EXISTE e voce nao quer
-- reimportar o `nutribalance_completo.sql` inteiro (que leva um tempo por
-- causa dos 597 alimentos da TACO).
--
-- Como importar:
--   phpMyAdmin (http://localhost/phpmyadmin) > banco `nutribalance` >
--   aba Importar > escolher este arquivo > Executar.
--
-- Rodar de novo e seguro (IF NOT EXISTS).
-- =====================================================================

USE nutribalance;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS redefinicoes_senha (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  INT UNSIGNED NOT NULL,
  token_hash  CHAR(64)     NOT NULL,          -- sha256 do token enviado no link
  expira_em   DATETIME     NOT NULL,          -- prazo de validade do link
  usado_em    DATETIME     NULL,              -- NULL = ainda nao foi usado
  criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_token_hash (token_hash),
  KEY idx_usuario_pendente (usuario_id, usado_em),
  CONSTRAINT fk_redefinicoes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
