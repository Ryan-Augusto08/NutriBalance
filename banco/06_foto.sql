-- NutriBalance — foto de perfil do usuario
-- Rode DEPOIS do 03_usuarios.sql, no mesmo banco `nutribalance`.
-- Adiciona a coluna `foto` (caminho do arquivo salvo em site/uploads/avatars/).
-- NULL = usuario sem foto (o app cai nas iniciais do nome).

USE nutribalance;

ALTER TABLE usuarios
  ADD COLUMN foto VARCHAR(255) NULL AFTER senha_hash;
