# NutriBalance — banco de dados

O banco `nutribalance` guarda três tabelas: `alimentos` (a **Tabela Brasileira
de Composição de Alimentos — TACO, 4ª edição**, que alimenta a busca do site),
`usuarios` (contas e personalização) e `medicoes` (histórico de peso e cintura).

## Arquivos

- `nutribalance_completo.sql` — o banco inteiro: as três tabelas e os 597
  alimentos já carregados. **É o único arquivo necessário para instalar.**
- `importar_taco.php` — lê `../dados/Taco-4a-Edicao.xlsx` e repopula a tabela
  `alimentos`. Só é usado para **regerar** os dados, não para instalar.

## Pré-requisitos

- XAMPP com **MySQL (MariaDB)** rodando (testado com MariaDB 10.4).
- Para regerar os dados, também **PHP** (testado com PHP 8.2).

## Instalar

**1. Importar o banco**

Pelo phpMyAdmin (http://localhost/phpmyadmin): aba *Importar* → escolher
`nutribalance_completo.sql` → *Executar*.

Ou pela linha de comando, a partir desta pasta (ajuste `D:\Xampp` se o seu
XAMPP estiver em outro caminho):

```
D:\Xampp\mysql\bin\mysql.exe -u root < nutribalance_completo.sql
```

Para conferir:

```sql
SELECT COUNT(*) FROM nutribalance.alimentos;   -- 597
SHOW TABLES FROM nutribalance;                  -- alimentos, medicoes, usuarios
```

Rodar de novo é seguro: as tabelas são preservadas (contas e medições não se
perdem) e apenas `alimentos` é recarregada do zero.

**2. Servir o site pelo Apache**

O site precisa ser servido pelo Apache — o PHP consulta o banco, e os módulos
ES do JavaScript só carregam por `http://`. Foi criado um *junction* em
`htdocs` apontando para a pasta do site (assim você edita no projeto e o Apache
serve ao vivo):

```
mklink /J "D:\Xampp\htdocs\nutribalance" "C:\Users\ryand\OneDrive\Desktop\TCC\MazyOS\site"
```

Com **Apache** e **MySQL** ligados no XAMPP, acesse:
**http://localhost/nutribalance/**

Se o `root` do seu MySQL tiver senha, ajuste `DB_PASS` em
`site/api/conexao.php` — é o único lugar onde as credenciais ficam.

## As tabelas

### `alimentos`

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

#### Como os valores especiais da TACO foram tratados

- `NA` (não disponível), `*` (não aplicável) e células em branco → `NULL`
- `Tr` (traço — quantidade insignificante, mas medida) → `0`

### `usuarios`

Guarda a conta (nome, e-mail, senha com hash, foto) e os dados de
personalização (sexo, idade, altura, peso, cintura, atividade, meta, peso
desejado) mais a meta diária calculada (`meta_kcal` e os três macros).

As colunas de personalização ficam `NULL` até o usuário completar o onboarding
— "perfil completo" significa `meta_kcal IS NOT NULL`.

A foto enviada é gravada em `site/uploads/fotos/`, e a coluna `foto` guarda o
caminho relativo do arquivo (`NULL` = o app usa as iniciais do nome).

### `medicoes`

Um registro por dia por usuário (`UNIQUE (usuario_id, data)`); registrar de
novo no mesmo dia atualiza o registro existente (upsert). Ao salvar, o
`usuarios.peso_kg` e as metas são atualizados com o peso mais recente.

O `usuarios.peso_kg` é o **peso atual**; `medicoes` é o **histórico** que
alimenta a seção *Progresso* e o gráfico de evolução. O mesmo vale para
`usuarios.cintura_cm` (cintura atual, definida na personalização), que também
semeia a primeira medição do histórico.

A chave estrangeira usa `ON DELETE CASCADE`: apagar um usuário leva junto o
histórico dele.

## Regerar os dados da TACO

Só é necessário se a planilha for atualizada ou se o mapeamento de colunas
mudar. O importador lê um arquivo `.xlsx` (que é um zip de XMLs), então precisa
da extensão `zip` do PHP — ligada só nessa execução, sem alterar o `php.ini`:

```
D:\Xampp\php\php.exe -d extension=php_zip.dll importar_taco.php
```

Saída esperada:

```
Importacao concluida: 597 alimentos inseridos.
Total na tabela: 597 | categorias distintas: 15
```

O script faz `TRUNCATE` antes de inserir, então pode rodar quantas vezes quiser
sem duplicar. Depois, gere de novo os `INSERT` do arquivo de instalação:

```
D:\Xampp\mysql\bin\mysqldump.exe -u root nutribalance alimentos \
  --no-create-info --complete-insert --default-character-set=utf8mb4
```

e substitua o bloco de `INSERT` no fim do `nutribalance_completo.sql` pela
saída (mantendo o `TRUNCATE TABLE alimentos` que vem antes dele).

## Nota histórica

Este banco já foi distribuído em nove arquivos numerados (`01_schema.sql` até
`09_renomear_metas.sql`), no estilo *migrations*. Isso faz sentido quando
existe um banco em produção cujos dados não se pode perder — o que nunca foi o
caso aqui. Sem essa necessidade, a cadeia numerada acumulou migrações que já
tinham sido absorvidas pela criação das tabelas e passaram a falhar em banco
novo. A consolidação num arquivo só trocou uma instalação de nove passos com
erros esperados por uma de um passo. O histórico da evolução do schema
continua no Git.
