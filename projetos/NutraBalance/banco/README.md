# NutraBalance — banco de dados

O banco `nutrabalance` guarda três tabelas: `alimentos` (a **Tabela Brasileira
de Composição de Alimentos — TACO, 4ª edição**, que alimenta a busca do site),
`usuarios` (contas e personalização) e `medicoes` (histórico de peso e cintura).

## Arquivos

- `nutrabalance_completo.sql` — o banco inteiro: as três tabelas e os 597
  alimentos já carregados. **É o único arquivo necessário para instalar.**
- `importar_taco.php` — lê `../dados/Taco-4a-Edicao.xlsx` e repopula a tabela
  `alimentos`. Só é usado para **regerar** os dados, não para instalar.
- `criar_conta_demo.php` — recria **só** a conta de demonstração, sem
  reimportar o banco. A conta já vem dentro do `nutrabalance_completo.sql`;
  este script existe para refazê-la ou para criá-la no Railway.

## Pré-requisitos

- XAMPP com **MySQL (MariaDB)** rodando (testado com MariaDB 10.4).
- Para regerar os dados, também **PHP** (testado com PHP 8.2).

## Instalar

**1. Importar o banco**

Pelo phpMyAdmin (http://localhost/phpmyadmin): aba *Importar* → escolher
`nutrabalance_completo.sql` → *Executar*.

Ou pela linha de comando, a partir desta pasta (ajuste `D:\Xampp` se o seu
XAMPP estiver em outro caminho):

```
D:\Xampp\mysql\bin\mysql.exe -u root < nutrabalance_completo.sql
```

Para conferir:

```sql
SELECT COUNT(*) FROM nutrabalance.alimentos;   -- 597
SHOW TABLES FROM nutrabalance;                  -- alimentos, medicoes, usuarios
```

Rodar de novo é seguro: as tabelas são preservadas (contas e medições não se
perdem) e apenas `alimentos` é recarregada do zero.

**2. Servir o site pelo Apache**

O site precisa ser servido pelo Apache — o PHP consulta o banco, e os módulos
ES do JavaScript só carregam por `http://`. Foi criado um *junction* em
`htdocs` apontando para a pasta do site (assim você edita no projeto e o Apache
serve ao vivo):

```
mklink /J "D:\Xampp\htdocs\nutrabalance" "C:\Users\ryand\OneDrive\Desktop\MazyOS\projetos\NutraBalance\site"
```

O caminho fica gravado como texto fixo dentro do link: se a pasta do projeto
for movida ou renomeada, o site para de abrir no localhost sem apontar
nenhum erro de código. Para consertar, apague o link e recrie apontando pro
caminho novo (`rmdir` num junction remove só o atalho, nunca a pasta de
destino):

```
rmdir "D:\Xampp\htdocs\nutrabalance"
mklink /J "D:\Xampp\htdocs\nutrabalance" "<novo caminho>\site"
```

Com **Apache** e **MySQL** ligados no XAMPP, acesse:
**http://localhost/nutrabalance/**

Se o `root` do seu MySQL tiver senha, ajuste `DB_PASS` em
`site/api/conexao.php` — é o único lugar onde as credenciais ficam.

**3. A conta de demonstração já veio junto**

O `nutrabalance_completo.sql` do passo 1 **já traz a conta demo**, com perfil
completo e 427 dias de peso e cintura. Não há passo extra: depois de importar,
o login abaixo já abre com histórico.

| E-mail | Senha |
|---|---|
| `demo@nutrabalance.com` | `demo123` |

Ela existe por sugestão da banca: um login que abre com o gráfico de Progresso
cheio, sem registrar meses de medições na hora. O que entrega, conferido em
01/10/2026 numa instalação feita do zero:

| Filtro | Pontos de peso | Pontos de cintura | Agrupamento |
|---|---|---|---|
| 7 dias | 8 | 4 | por dia |
| 1 mês | 16 | 8 | por dia |
| 3 meses | 24 | 12 | por semana |
| 1 ano | 64 | 32 | por mês |
| Tudo | 73 | 36 | por mês |

**As datas são relativas ao dia da importação**, não fixas — e é isso que
impede o arquivo de envelhecer. Um dump comum congela as datas: importado duas
semanas depois de gerado, a medição mais recente já estaria com 14 dias e os
filtros "7 dias" e "1 mês" apareceriam **vazios**. No arquivo cada linha entra
como `DATE_SUB(CURDATE(), INTERVAL n DAY)`.

As refeições **não** entram: elas ficam no `localStorage` do navegador, não no
banco. Levá-las para o banco é a próxima etapa planejada.

### Recriar só a conta demo

Para refazer a conta sem reimportar o banco inteiro, a partir desta pasta:

```
D:Xamppphpphp.exe criar_conta_demo.php
```

Rodar de novo apaga e recria **só** a conta demo — contas reais não são
tocadas, porque o `DELETE` filtra pelo e-mail e a chave estrangeira usa
`ON DELETE CASCADE`.

Para criar a conta no banco do Railway, defina antes `DB_HOST`, `DB_PORT`,
`DB_NAME`, `DB_USER` e `DB_PASS` no terminal.

⚠️ **O `criar_conta_demo.php` é a fonte da verdade da curva de peso.** Se ela
mudar lá, o bloco `CONTA DE DEMONSTRACAO` no fim do
`nutrabalance_completo.sql` precisa ser gerado de novo — senão o script e o
arquivo de instalação passam a criar contas diferentes.

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
D:\Xampp\mysql\bin\mysqldump.exe -u root nutrabalance alimentos \
  --no-create-info --complete-insert --default-character-set=utf8mb4
```

e substitua o bloco de `INSERT` no fim do `nutrabalance_completo.sql` pela
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
