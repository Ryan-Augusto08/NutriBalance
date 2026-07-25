-- NutriBalance — adiciona a coluna `cintura_cm` na tabela usuarios.
-- Rode DEPOIS do 03_usuarios.sql, no mesmo banco `nutribalance`.
-- Guarda a cintura ATUAL do perfil (como peso_kg guarda o peso atual). O
-- historico ao longo do tempo continua na tabela `medicoes` (07_medicoes.sql).

USE nutribalance;

ALTER TABLE usuarios
  ADD COLUMN cintura_cm DECIMAL(5,1) NULL AFTER peso_kg;   -- cm (opcional)
