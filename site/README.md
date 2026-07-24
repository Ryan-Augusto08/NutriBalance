# NutriBalance — site

Protótipo funcional em HTML/CSS/JS puro no front-end, com backend em PHP e
banco MySQL para a busca de alimentos. Dados de perfil e refeições ainda
ficam no `localStorage` do navegador.

## Rodar (XAMPP)

A busca de alimentos consulta o MySQL via PHP, então o site precisa ser
servido pelo Apache (não abra por `file://`).

1. No **XAMPP Control Panel**, inicie **Apache** e **MySQL**.
2. Se ainda não importou a TACO, rode os passos em [`../banco/README.md`](../banco/README.md).
3. Acesse **http://localhost/nutribalance/** (via junction em `htdocs` que aponta
   para esta pasta — veja o README do banco).

## Estrutura

- `index.html` — estrutura da página
- `css/style.css` — identidade visual (cores/tipografia seguem `identidade/design-guide.md`)
- `js/app.js` — lógica (dados, cálculo do resumo diário, busca de alimentos, gráficos, modais)
- `js/progresso.js` — seção Progresso (histórico de peso/cintura + gráfico de evolução em SVG)
- `api/conexao.php` — conexão PDO com o MySQL
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
- O gráfico pizza divide as fatias por contribuição calórica de cada macro
  (carbo×4, proteína×4, gordura×9), como no MyFitnessPal; as gramas aparecem em texto.

## O que falta

- Foto real do banner (`img/banner.jpg`) — hoje é um gradiente placeholder
- Logo oficial do NutriBalance (ver `identidade/design-guide.md`)
- Persistência das refeições em banco (hoje só a busca de alimentos usa MySQL;
  perfil e refeições ainda são `localStorage`)
- Autenticação de usuário (perfil único local por enquanto)
