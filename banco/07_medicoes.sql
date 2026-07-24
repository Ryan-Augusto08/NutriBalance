-- NutriBalance — tabela de medicoes (historico de peso + cintura)
-- Rode DEPOIS do 03_usuarios.sql, no mesmo banco `nutribalance`.
-- Guarda o progresso ao longo do tempo (um registro por dia por usuario).
-- O `usuarios.peso_kg` continua sendo o peso ATUAL; esta tabela e o historico.

USE nutribalance;

CREATE TABLE IF NOT EXISTS medicoes (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  INT UNSIGNED NOT NULL,
  data        DATE          NOT NULL,          -- dia da medicao
  peso_kg     DECIMAL(5,1)  NOT NULL,          -- kg
  cintura_cm  DECIMAL(5,1)  NULL,              -- cm (opcional)
  criado_em   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_data (usuario_id, data),   -- um registro por dia (upsert)
  CONSTRAINT fk_medicoes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
