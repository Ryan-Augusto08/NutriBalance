# Identidade visual

> Como a marca aparece em tudo que o MazyOS gera.
> As skills de conteúdo, carrossel e post leem esse arquivo antes de criar qualquer visual.
> Edite quando a marca evoluir.

---

## Cores

- **Fundo principal:** verde bem claro / esverdeado suave

- **Cor de destaque / CTA:** verde (botão de adicionar refeição, título "Nutri")

- **Texto principal:** preto/cinza escuro

- **Fundo alternativo / cards:** branco, com cantos arredondados; tiles de estatística em tons pastel (rosa, amarelo, laranja claro)

- **Cor proibida:** —

---

## Tipografia

- **Títulos e destaques:** sans-serif limpa (estilo do título "NutriBalance" no header)

- **Corpo, subtítulos e botões:** mesma família sans-serif, peso regular

- **Peso do título:** bold/semibold

---

## Estilo geral

Visual limpo e leve, tema de alimentação saudável — fotos de comida no
banner do topo, cards brancos organizados em lista, ícones pequenos
coloridos por categoria de macro (kcal, proteína, carboidrato, gordura).

---

## Elementos-chave

- Bordas: sutis, baixo contraste
- Border-radius dos cards: arredondado (médio/alto)
- Botões: sólidos, cor verde para ação principal (+)
- Sombras: leves, para destacar os cards sobre o fundo esverdeado

---

## O que NUNCA fazer

- Não fugir do tema verde/saúde para cores que destoem do universo de bem-estar

---

## Logo

Duas variantes. **Atenção ao nome dos arquivos:** `logo.png` significa coisas
diferentes em `identidade/` e em `site/img/` — conferir a pasta antes de usar.

**Variante completa** (símbolo + texto + tagline)

- **Arquivo:** `identidade/logo.png`, duplicado como `identidade/logo2.png` e `site/img/logo2.png` (os três são o mesmo arquivo, byte a byte)
- **Descrição:** ícone circular com pessoa de braços abertos entre folhas verdes e uma tigela de salada laranja/verde; abaixo, texto "NutriBalance" ("Nutri" em verde escuro, "Balance" em preto) com tagline "equilíbrio que transforma saúde em vida"
- **Onde usar:** telas de acesso do site (login, cadastro, esqueceu-senha, redefinir-senha, personalização), favicon de todas as páginas, slide final do carrossel (CTA), header de propostas, slides de apresentação

**Variante símbolo** (só o ícone circular, sem texto)

- **Arquivo:** `site/img/logo.png` — existe apenas dentro do site, sem cópia em `identidade/`
- **Onde usar:** header do dashboard, onde o nome "NutriBalance" já aparece como texto ao lado

**Comuns às duas**

- **Versão pra fundo escuro:** não definida
- **Tamanho sugerido:** largura entre 120-200px nos HTMLs

---

## Observações adicionais

Logo salva em 2026-07-20.

A tela de cadastro está fora do padrão: [`site/cadastro.html`](../site/cadastro.html)
usa a variante símbolo, enquanto as outras telas de acesso usam a completa.
Pendente decidir qual das duas vira o padrão e alinhar.
