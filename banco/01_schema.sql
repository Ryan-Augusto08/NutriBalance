-- NutriBalance — esquema do banco de dados
-- Fonte dos dados: Tabela Brasileira de Composicao de Alimentos (TACO), 4a edicao.
-- Todos os valores nutricionais sao por 100 g de parte comestivel do alimento.

CREATE DATABASE IF NOT EXISTS nutribalance
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nutribalance;

DROP TABLE IF EXISTS alimentos;

CREATE TABLE alimentos (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero_taco   INT UNSIGNED NULL,               -- numero do alimento na TACO
  categoria     VARCHAR(80)  NULL,               -- grupo (ex: "Cereais e derivados")
  descricao     VARCHAR(255) NOT NULL,           -- nome do alimento

  -- macronutrientes e energia (por 100 g)
  umidade       DECIMAL(8,3) NULL,               -- %
  energia_kcal  DECIMAL(8,2) NULL,               -- kcal
  energia_kj    DECIMAL(8,2) NULL,               -- kJ
  proteina      DECIMAL(8,3) NULL,               -- g
  lipideos      DECIMAL(8,3) NULL,               -- g (gordura)
  carboidrato   DECIMAL(8,3) NULL,               -- g
  fibra         DECIMAL(8,3) NULL,               -- g
  colesterol    DECIMAL(8,2) NULL,               -- mg
  cinzas        DECIMAL(8,3) NULL,               -- g

  -- minerais (por 100 g)
  calcio        DECIMAL(10,3) NULL,              -- mg
  magnesio      DECIMAL(10,3) NULL,              -- mg
  manganes      DECIMAL(10,3) NULL,              -- mg
  fosforo       DECIMAL(10,3) NULL,              -- mg
  ferro         DECIMAL(10,3) NULL,              -- mg
  sodio         DECIMAL(10,3) NULL,              -- mg
  potassio      DECIMAL(10,3) NULL,              -- mg
  cobre         DECIMAL(10,3) NULL,              -- mg
  zinco         DECIMAL(10,3) NULL,              -- mg

  -- vitaminas (por 100 g)
  retinol       DECIMAL(10,3) NULL,              -- mcg
  rae           DECIMAL(10,3) NULL,              -- mcg
  tiamina       DECIMAL(10,3) NULL,              -- mg
  riboflavina   DECIMAL(10,3) NULL,              -- mg
  piridoxina    DECIMAL(10,3) NULL,              -- mg
  niacina       DECIMAL(10,3) NULL,              -- mg
  vitamina_c    DECIMAL(10,3) NULL,              -- mg

  PRIMARY KEY (id),
  KEY idx_descricao (descricao),
  KEY idx_categoria (categoria),
  FULLTEXT KEY ft_descricao (descricao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
