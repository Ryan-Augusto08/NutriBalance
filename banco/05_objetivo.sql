-- NutriBalance — migracao: adiciona a coluna objetivo em usuarios.
-- Rode em instalacoes que ja criaram a tabela `usuarios` antes dessa coluna existir.
-- (Em bancos novos, o 03_usuarios.sql ja cria a coluna; esta migracao e inofensiva
--  mas dara erro se a coluna ja existir — nesse caso, pode ignorar.)
-- objetivo = 'definir' (recomposicao) so faz sentido quando meta = 'manter'.

USE nutribalance;

ALTER TABLE usuarios ADD COLUMN objetivo ENUM('manter','definir') NULL AFTER meta;
