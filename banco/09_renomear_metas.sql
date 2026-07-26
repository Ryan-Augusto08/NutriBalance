-- NutriBalance — migracao: renomeia as colunas de meta para portugues.
-- Rode DEPOIS do 03_usuarios.sql, no mesmo banco `nutribalance`.
--   goal_kcal     -> meta_kcal
--   goal_carbo    -> meta_carbo
--   goal_proteina -> meta_proteina
--   goal_gordura  -> meta_gordura
-- (Em bancos novos, o 03_usuarios.sql ja cria as colunas com o nome novo; esta
--  migracao e inofensiva mas dara erro se as colunas ja estiverem renomeadas —
--  nesse caso, pode ignorar.)
--
-- Usa CHANGE, e nao RENAME COLUMN: o XAMPP roda MariaDB 10.4 e o
-- RENAME COLUMN so existe a partir do MariaDB 10.5.2. O CHANGE funciona em
-- qualquer versao, mas exige repetir o tipo da coluna (ver 03_usuarios.sql).
-- Renomear preserva os dados — nenhuma meta ja calculada e perdida.

USE nutribalance;

ALTER TABLE usuarios
  CHANGE goal_kcal     meta_kcal     INT UNSIGNED NULL,   -- kcal/dia
  CHANGE goal_carbo    meta_carbo    INT UNSIGNED NULL,   -- g
  CHANGE goal_proteina meta_proteina INT UNSIGNED NULL,   -- g
  CHANGE goal_gordura  meta_gordura  INT UNSIGNED NULL;   -- g
