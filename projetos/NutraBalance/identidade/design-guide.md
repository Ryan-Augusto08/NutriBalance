# Identidade visual

> Como a marca aparece em tudo que o MazyOS gera.
> As skills de conteúdo, carrossel e post leem esse arquivo antes de criar qualquer visual.
> Edite quando a marca evoluir.

---

## Cores

- **Fundo principal:** verde bem claro / esverdeado suave

- **Cor de destaque / CTA:** verde (botão de adicionar refeição, título "Nutra")

- **Texto principal:** preto/cinza escuro

- **Fundo alternativo / cards:** branco, com cantos arredondados; tiles de estatística em tons pastel (rosa, amarelo, laranja claro)

- **Cor proibida:** —

---

## Tipografia

- **Títulos e destaques:** sans-serif limpa (estilo do título "NutraBalance" no header)

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

Duas variantes, com a mesma convenção de nome nas duas pastas: **`logo.png` é
o símbolo, `logo2.png` é a versão completa.** `identidade/` guarda os originais
e `site/img/` as cópias usadas nas telas. Ambas têm fundo transparente.

**Variante completa** (símbolo + texto + tagline)

- **Arquivo:** `identidade/logo2.png`, copiado sem alteração para `site/img/logo2.png` (os dois são o mesmo arquivo, byte a byte)
- **Dimensões:** 821x643 px
- **Descrição:** ícone circular com pessoa de braços abertos entre folhas verdes e uma tigela de salada laranja/verde; abaixo, texto "NutraBalance" ("Nutra" em verde claro, "Balance" em verde escuro) com tagline "equilíbrio que transforma saúde em vida"
- **Onde usar:** telas de acesso do site (login, esqueceu-senha, redefinir-senha, personalização), favicon de todas as páginas, slide final do carrossel (CTA), header de propostas, slides de apresentação

**Variante símbolo** (só o ícone circular, sem texto)

- **Arquivo original:** `identidade/logo.png`, 821x643 px — o ícone ocupa só 67% da altura, o resto é moldura vazia
- **Arquivo do site:** `site/img/logo.png`, 453x453 px — o mesmo ícone recortado rente, com 10 px de folga
- **Onde usar:** header do dashboard, onde o nome "NutraBalance" já aparece como texto ao lado; e na tela de cadastro

**Por que a versão do site é recortada**

O CSS dimensiona as duas logos pela **altura**, com `width: auto` — 88 px no
header do dashboard (`.logo-img`) e 160 px nas telas de acesso
(`.acesso-logo`). Com moldura vazia, a altura reservada é gasta com espaço em
branco: o original de 67% de aproveitamento renderizaria o ícone a 59 px dentro
de um espaço de 88 px, encolhido e desalinhado. Por isso a cópia do site vai
recortada. **Ao trocar a logo, recortar antes de copiar para `site/img/`.**

**Comuns às duas**

- **Versão pra fundo escuro:** não definida (o fundo transparente já resolve a maioria dos casos)
- **Tamanho sugerido:** largura entre 120-200px nos HTMLs


---

## Observações adicionais

Logo salva em 2026-07-20. Refeita em 2026-08-22 com o nome NutraBalance, na
renomeação do projeto. Passou por duas trocas no mesmo dia: primeiro as
variantes que vieram do pendrive, depois as definitivas que o Ryan gerou. As
anteriores tinham fundo branco e 261x203 (completa) e 400x400 (símbolo); as
atuais têm fundo transparente e resolução maior.

A tela de cadastro está fora do padrão: [`site/cadastro.html`](../site/cadastro.html)
usa a variante símbolo, enquanto as outras telas de acesso usam a completa.
Pendente decidir qual das duas vira o padrão e alinhar.
