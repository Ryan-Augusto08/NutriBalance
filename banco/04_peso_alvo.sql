-- NutriBalance — migracao: adiciona a coluna peso_alvo em usuarios.
-- Rode em instalacoes que ja criaram a tabela `usuarios` antes dessa coluna existir.
-- (Em bancos novos, o 03_usuarios.sql ja cria a coluna; esta migracao e inofensiva
--  mas dara erro se a coluna ja existir — nesse caso, pode ignorar.)

USE nutribalance;

ALTER TABLE usuarios ADD COLUMN peso_alvo DECIMAL(5,1) NULL AFTER peso_kg;
