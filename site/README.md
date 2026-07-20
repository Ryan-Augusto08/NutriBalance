# NutriBalance — site

Protótipo funcional em HTML/CSS/JS puro, sem build step. Dados (perfil e
refeições) ficam salvos no `localStorage` do navegador — não há backend
ainda.

## Rodar

Abra `index.html` direto no navegador, ou sirva a pasta com um servidor
local (recomendado, pra evitar restrições de `file://`):

```
npx serve site
```

## Estrutura

- `index.html` — estrutura da página
- `css/style.css` — identidade visual (cores/tipografia seguem `identidade/design-guide.md`)
- `js/app.js` — lógica (dados, cálculo do resumo diário, modais de adicionar refeição/editar perfil)
- `img/` — coloque aqui `banner.jpg` (foto do topo) quando tiver o arquivo real

## O que falta

- Foto real do banner (`img/banner.jpg`) — hoje é um gradiente placeholder
- Logo oficial do NutriBalance (ver `identidade/design-guide.md`)
- Persistência real (banco de dados / backend) — hoje é só localStorage do navegador
- Autenticação de usuário (perfil único local por enquanto)
