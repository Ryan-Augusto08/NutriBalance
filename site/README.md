# NutriBalance — site

Protótipo funcional em HTML/CSS/JS puro no front-end, com backend em PHP e
banco MySQL para a busca de alimentos. Dados de perfil e refeições ainda
ficam no `localStorage` do navegador.

## Rodar (XAMPP)

A busca de alimentos consulta o MySQL via PHP, então o site precisa ser
servido pelo Apache (não abra por `file://`).

1. No **XAMPP Control Panel**, inicie **Apache** e **MySQL**.
2. Se ainda não importou o banco, importe `banco/nutribalance_completo.sql` —
   veja [`../banco/README.md`](../banco/README.md).
3. Acesse **http://localhost/nutribalance/** (via junction em `htdocs` que aponta
   para esta pasta — veja o README do banco).

> O JavaScript usa **módulos ES** (`<script type="module">`), que o navegador só
> carrega por `http://`. É mais um motivo para não abrir o `index.html` por
> clique duplo.

## Estrutura

Páginas: `index.html` (dashboard), `login.html`, `cadastro.html` e
`personalizacao.html` (onboarding).

**CSS** — uma folha por área, todas dependentes de `base.css`:

- `css/base.css` — variáveis de cor, reset e componentes compartilhados (botões,
  legenda de macros). Cores e tipografia seguem `identidade/design-guide.md`
- `css/dashboard.css` — cabeçalho, navegação por data, resumo do dia, refeições
- `css/perfil.css` — card de perfil e foto
- `css/progresso.css` — histórico de peso/cintura e gráfico
- `css/alimentos.css` / `css/modal.css` — modal de busca e modal genérico
- `css/acesso.css` — login, cadastro e personalização

**JavaScript** — `principal.js` é o único script que o dashboard carrega; o
resto entra por `import`:

- `js/principal.js` — boot: valida a sessão e monta o dashboard
- `js/estado.js` — estado compartilhado (dados, dia exibido, previsão)
- `js/dados.js` — `localStorage` e migração entre versões do formato
- `js/utilitarios.js` / `js/macros.js` — datas e texto / cálculo de macros
- `js/tela.js` — desenho do dashboard
- `js/refeicoes.js` / `js/alimentos.js` / `js/perfil.js` — as três áreas de interação
- `js/progresso.js` — seção Progresso (histórico + gráfico de evolução em SVG)
- `js/calculo.js` — metas, TDEE, IMC e previsão de prazo (usado também no onboarding)
- `js/auth.js` — login, cadastro, logout e guarda de sessão
- `js/senha.js` — botão "olhinho" que mostra/oculta os campos de senha

**Backend** (`api/`):

- `api/conexao.php` — conexão PDO com o MySQL (única fonte das credenciais)
- `api/buscar.php` — endpoint de busca na TACO (`GET api/buscar.php?q=arroz`)
- `api/salvar_medicao.php` / `api/listar_medicoes.php` — registro e leitura do histórico de medições
- `img/` — coloque aqui `banner.jpg` (foto do topo) quando tiver o arquivo real

## Banco de alimentos (TACO / MySQL)

A busca usa a **Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição**,
importada para um banco MySQL local (597 alimentos). Ao adicionar um alimento a
uma refeição, você busca por nome, escolhe a quantidade em gramas e os macros são
calculados a partir dos valores por 100 g.

- A busca é **acento-insensível** (digitar `acucar` acha `Açúcar`) e casa por
  palavras (`arroz cozido` acha `Arroz, integral, cozido`).
- Se o Apache/MySQL estiverem desligados, use o botão **"Adicionar manualmente"**
  no modal — o app continua funcionando na apresentação.
- O consumo do dia aparece em barras de progresso até a meta (kcal, carboidrato,
  proteína e gordura), com a legenda em gramas por macro.

## O que falta

- Foto real do banner (`img/banner.jpg`) — hoje é um gradiente placeholder
- Logo oficial do NutriBalance (ver `identidade/design-guide.md`)
- Persistência das refeições em banco (hoje conta, perfil, metas e histórico de
  medições estão no MySQL; só as refeições do dia seguem no `localStorage`)
