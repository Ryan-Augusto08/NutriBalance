# NutriBalance — banco de dados (TACO no MySQL)

Importa a **Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição**
para um banco MySQL, que alimenta a busca de alimentos do site.

## Arquivos

- `01_schema.sql` — cria o banco `nutribalance` e a tabela `alimentos`
- `02_importar.php` — lê `../dados/Taco-4a-Edicao.xlsx` e popula a tabela
- `03_usuarios.sql` — cria a tabela `usuarios` (login + personalização)
- `04_peso_alvo.sql`, `05_objetivo.sql` — colunas de peso desejado e objetivo
- `06_foto.sql` — adiciona a coluna `foto` (foto de perfil do usuário)
- `07_medicoes.sql` — cria a tabela `medicoes` (histórico de peso + cintura)
- `08_cintura.sql` — adiciona a coluna `cintura_cm` em `usuarios` (cintura atual)
- `09_renomear_metas.sql` — renomeia `goal_*` para `meta_*` (código em português)

## Pré-requisitos

- XAMPP com **MySQL (MariaDB)** e **PHP** (testado com PHP 8.2 / MariaDB 10.4).
- No XAMPP Control Panel, o **MySQL** precisa estar rodando.
- A planilha `Taco-4a-Edicao.xlsx` deve estar em `../dados/`.

## Passo a passo

Rode a partir desta pasta (`banco/`). Ajuste `D:\Xampp` se o seu XAMPP
estiver em outro caminho.

**1. Criar o banco e a tabela**

```
D:\Xampp\mysql\bin\mysql.exe -u root < 01_schema.sql
```

Ou, pelo phpMyAdmin (http://localhost/phpmyadmin): aba *Importar* → escolher
`01_schema.sql`.

**2. Importar os dados da TACO**

O importador lê um arquivo `.xlsx` (que é um zip de XMLs), então precisa da
extensão `zip` do PHP. Ela é ligada só nessa execução, sem alterar o `php.ini`:

```
D:\Xampp\php\php.exe -d extension=php_zip.dll 02_importar.php
```

Saída esperada:

```
Importacao concluida: 597 alimentos inseridos.
Total na tabela: 597 | categorias distintas: 15
```

**3. Criar a tabela de usuários (login + personalização)**

```
D:\Xampp\mysql\bin\mysql.exe -u root < 03_usuarios.sql
```

Ou, pelo phpMyAdmin: aba *Importar* → escolher `03_usuarios.sql`. A tabela
`usuarios` guarda a conta (nome, e-mail, senha com hash) e os dados de
personalização (sexo, idade, altura, peso, atividade, meta) + a meta diária
calculada (`meta_kcal` e macros). As colunas de personalização ficam `NULL`
até o usuário completar o onboarding — "perfil completo" = `meta_kcal IS NOT NULL`.

**4a. Colunas adicionais (peso alvo, objetivo e foto de perfil)**

Se você criou a tabela `usuarios` antes dessas colunas existirem, rode as
migrações que faltarem:

```
D:\Xampp\mysql\bin\mysql.exe -u root < 04_peso_alvo.sql
D:\Xampp\mysql\bin\mysql.exe -u root < 05_objetivo.sql
D:\Xampp\mysql\bin\mysql.exe -u root < 06_foto.sql
```

A foto enviada pelo usuário é gravada em `site/uploads/fotos/`, e a coluna
`foto` guarda o caminho relativo do arquivo (NULL = usa as iniciais do nome).

**4b. Tabela de medições (histórico de progresso)**

Cria o histórico de peso/cintura ao longo do tempo, que alimenta a seção
*Progresso* e o gráfico de evolução no dashboard:

```
D:\Xampp\mysql\bin\mysql.exe -u root < 07_medicoes.sql
D:\Xampp\mysql\bin\mysql.exe -u root < 08_cintura.sql
```

A tabela `medicoes` guarda um registro por dia por usuário (`UNIQUE
(usuario_id, data)`); registrar de novo no mesmo dia atualiza o registro
(upsert). Ao salvar, o `usuarios.peso_kg` e as metas são atualizados com o
peso mais recente. O `usuarios.peso_kg` continua sendo o **peso atual**;
`medicoes` é o **histórico**. O `08_cintura.sql` adiciona `usuarios.cintura_cm`
(cintura atual do perfil, definida na personalização) — que também semeia a
primeira medição do histórico.

**4c. Renomear as colunas de meta para português**

O código do projeto é todo em português; esta migração alinha as quatro colunas
de meta, que tinham nascido em inglês:

```
D:\Xampp\mysql\bin\mysql.exe -u root < 09_renomear_metas.sql
```

`goal_kcal` → `meta_kcal`, `goal_carbo` → `meta_carbo`, `goal_proteina` →
`meta_proteina`, `goal_gordura` → `meta_gordura`. Renomear preserva os dados —
nenhuma meta já calculada é perdida. Em bancos criados do zero com o
`03_usuarios.sql` atual, as colunas já nascem com o nome novo e esta migração
não é necessária.

**4. Servir o site pelo Apache**

O site precisa ser servido pelo Apache para o PHP consultar o banco. Foi criado
um *junction* em `htdocs` apontando para a pasta do site (assim você edita no
projeto e o Apache serve ao vivo):

```
mklink /J "D:\Xampp\htdocs\nutribalance" "C:\Users\ryand\OneDrive\Desktop\TCC\MazyOS\site"
```

Com **Apache** e **MySQL** ligados no XAMPP, acesse:
**http://localhost/nutribalance/**

## A tabela `alimentos`

Uma linha por alimento; todos os valores são **por 100 g** de parte comestível.

| Coluna | Descrição |
|---|---|
| `id` | chave primária (auto) |
| `numero_taco` | número do alimento na TACO |
| `categoria` | grupo (ex: "Cereais e derivados") |
| `descricao` | nome do alimento |
| `energia_kcal`, `energia_kj` | energia |
| `proteina`, `lipideos`, `carboidrato`, `fibra` | macronutrientes (g) |
| `colesterol`, `cinzas` | mg / g |
| `calcio`, `magnesio`, `manganes`, `fosforo`, `ferro`, `sodio`, `potassio`, `cobre`, `zinco` | minerais (mg) |
| `retinol`, `rae`, `tiamina`, `riboflavina`, `piridoxina`, `niacina`, `vitamina_c` | vitaminas |

### Como os valores especiais da TACO foram tratados

- `NA` (não disponível), `*` (não aplicável) e células em branco → `NULL`
- `Tr` (traço — quantidade insignificante, mas medida) → `0`

## Reimportar / recomeçar

O `02_importar.php` faz `TRUNCATE` na tabela antes de inserir, então pode
rodar quantas vezes quiser sem duplicar. Para recriar a tabela do zero,
rode de novo o `01_schema.sql`.
