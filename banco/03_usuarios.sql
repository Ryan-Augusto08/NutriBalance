-- NutriBalance — tabela de usuarios (login + personalizacao)
-- Rode DEPOIS do 01_schema.sql, no mesmo banco `nutribalance`.
-- Preserva as tabelas ja existentes (alimentos) e NAO toca no banco bd_sistema_ryan.

USE nutribalance;

CREATE TABLE IF NOT EXISTS usuarios (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  senha_hash    VARCHAR(255) NOT NULL,             -- password_hash (PASSWORD_DEFAULT)

  -- personalizacao (NULL ate o usuario completar o onboarding)
  sexo          ENUM('M','F') NULL,
  idade         INT UNSIGNED NULL,                 -- anos
  altura_cm     INT UNSIGNED NULL,                 -- cm
  peso_kg       DECIMAL(5,1)  NULL,                -- kg
  peso_alvo     DECIMAL(5,1)  NULL,                -- kg (so quando meta = 'perder')
  atividade     ENUM('sedentario','leve','moderado','intenso','muito_intenso') NULL,
  meta          ENUM('perder','manter','ganhar') NULL,
  objetivo      ENUM('manter','definir') NULL,     -- so quando meta = 'manter' (definir = recomposicao)

  -- metas calculadas (meta_kcal IS NOT NULL == perfil completo)
  meta_kcal     INT UNSIGNED NULL,                 -- kcal/dia
  meta_carbo    INT UNSIGNED NULL,                 -- g
  meta_proteina INT UNSIGNED NULL,                 -- g
  meta_gordura  INT UNSIGNED NULL,                 -- g

  criado_em     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
