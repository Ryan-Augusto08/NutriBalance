# Produto — site + carrosséis vendáveis

> Escrito em 17/08/2026. Como transformar o que hoje é trabalho artesanal
> num produto que se vende, se entrega em dias e **não prende o Ryan a cada
> cliente**.

---

## O problema, em uma frase

O site da Valéria é bonito e funciona, mas **não é um produto** — é uma peça
feita à mão. As 495 linhas do `index.html` têm o texto cravado dentro da
estrutura. Não existe lugar onde um cliente possa mudar uma palavra sem mexer
em HTML, e não existe jeito de clonar aquilo para o próximo cliente sem
reescrever tudo.

Duas coisas já estão a favor, e é sobre elas que o produto se constrói:

1. **O tema já é variável.** O `:root` do CSS tem 20 linhas com cores, fontes
   e larguras. Trocar a marca inteira é editar esse bloco.
2. **O carrossel já é HTML/CSS parametrizável.** Os layouts (CAPA, NÚMERO,
   DUO, CTA) e o motor de render foram provados em 17/08.

O que falta é separar **conteúdo** de **estrutura**, e dar ao cliente uma
porta de entrada que não seja o código.

---

## O que o sistema precisa entregar

Três exigências, e o sistema só existe se as três forem verdade ao mesmo
tempo. Elas mandam em toda decisão técnica deste documento.

**1. O cliente muda texto e foto sozinho.** Não é "pede e a gente faz rápido"
— é ele abrir, trocar e publicar sem passar por você. Vale para preço,
horário, telefone, parágrafo do "sobre" e **imagem de galeria**. Trocar foto
é tão comum quanto trocar texto, e não pode virar chamado.

**2. O cliente cria os próprios carrosséis, na frequência dele.** Diário,
semanal, quando quiser. Isso é mais duro do que parece: significa que o
gerador precisa ser rápido de usar (minutos, não meia hora), ter variedade de
layout suficiente para não repetir a mesma cara toda semana, e funcionar no
**celular**, que é onde ele vai estar quando lembrar de postar.

**3. Você não fica preso.** O trabalho recorrente é o que você escolheu
vender, não o que sobra de pedido pequeno. Cada "muda esse texto" que chega
no seu WhatsApp é uma falha do sistema, não um favor.

### O que isso NÃO é

Não é uma plataforma multi-inquilino com banco, login e painel central. Isso
é SaaS, leva meses e não se paga a R$ 1.500 por cliente.

É uma **linha de montagem**: um molde versionado, clonado por cliente, cada
um com o próprio deploy e o próprio acesso. O cliente não sabe que é um
molde — para ele, é o site dele. Para você, é a mesma base recebendo
melhoria uma vez e chegando em todos.

Se um dia houver 30 clientes, aí a conversa sobre plataforma faz sentido.
Com 6, ela só atrasa o primeiro real.

---

## Pré-requisito: instalar o Node

**Nada disso roda hoje.** Esta máquina não tem `node`, `npm` nem `npx`
*(verificado em 18/08/2026)*, e o Astro depende dos três. O `winget` está
disponível, então é um comando:

```
winget install OpenJS.NodeJS.LTS
```

Depois, fechar e reabrir o terminal e confirmar com `node --version`.

Efeito colateral bom: com Node instalado, o `/carrossel` volta a poder usar
Playwright em vez do Edge headless — embora o Edge continue funcionando e não
precise ser trocado com pressa.

---

## A arquitetura

Construir **uma vez**, vender muitas.

```
template-mazyos/                 ← um repositório, molde de todos os clientes
  marca.json                     ← cores, fontes, logo, telefone, @, endereço
  conteudo/                      ← o texto do site, em Markdown
    home.md  servicos.md  sobre.md
  src/                           ← a estrutura (Astro), igual em todo cliente
  estudio/                       ← o gerador de carrossel do cliente
```

**Astro** como base. Escolhido porque o produto precisa das duas coisas no
mesmo deploy: um site estático rápido (bom para Google) **e** uma aplicação
interativa (o gerador). Eleventy é mais simples mas não resolve bem a segunda.

**Netlify** para hospedar — já em uso, e o plano gratuito cobre um cliente
pequeno com folga.

### O gerador de carrossel

Uma página do próprio site do cliente, protegida por senha. Ele escolhe o
layout, digita, vê a prévia e baixa os PNGs.

O ponto técnico que faz isso ser barato: **a exportação acontece no navegador
dele**, não num servidor. O slide é montado em HTML/CSS a 1080x1350 num
contêiner escondido, a prévia mostra o mesmo nó reduzido por `transform:
scale()`, e a exportação captura o nó em tamanho natural. Sem servidor de
render, sem Playwright, sem custo por imagem gerada.

Duas condições para funcionar: **fontes auto-hospedadas** (não Google Fonts
por link — a captura não espera fonte externa) e imagens em mesma origem.

**O que o cliente controla:** o texto, a ordem dos slides, qual layout usa.
**O que ele não controla:** a paleta, a tipografia, o espaçamento, o logo.
É isso que impede o material de virar aquilo que o design-guide chama de
"template genérico de IA" e mantém a marca dele de pé.

### A edição do site

**TinaCMS.** Ele foi feito exatamente para o caso "agência entrega site para
cliente não técnico": edição visual, o cliente clica no texto da própria
página e digita. Por trás, salva em Git — então o histórico e o controle
continuam seus.

**Por que não a opção óbvia:** Decap CMS (o antigo Netlify CMS) depende do
Netlify Identity, que **está descontinuado**. O Sveltia CMS é o sucessor
moderno, aceita a mesma configuração — mas a solução de login dele para
substituir o Identity está prevista só para o **fim de 2026**. Até lá, ele
exige que o cliente tenha conta no GitHub, o que não se pede a uma designer
de sobrancelhas.

O plano gratuito do Tina cobre **2 usuários** com conteúdo ilimitado — na
prática, você e o cliente. *A verificar antes de vender: se cada site pode
ser um projeto gratuito separado, ou se o limite é por conta.* Se for por
conta, o plano Team (US$29/mês) dilui entre todos os clientes e continua
barato por cabeça.

---

## A divisão do trabalho

Essa tabela é o coração da oferta — e deve entrar no contrato quase como está.

| O cliente faz sozinho | Fica com você |
|---|---|
| Trocar qualquer texto do site | Mudar seções, criar página nova |
| Trocar preço, horário, telefone | Mexer em layout ou estrutura |
| Gerar e editar carrosséis | Criar **layout novo** de slide |
| Trocar foto de galeria | Ajuste de identidade visual |
| Publicar (sai no ar em ~1 min) | Domínio, deploy, backup, quebras |

A regra que resolve a ansiedade do cliente e protege o seu tempo:
**"se é conteúdo, é você; se é estrutura, sou eu."**

**Sobre frequência:** o cliente do plano Essencial vai gerar carrossel na
cadência dele — pode ser um por dia. O sistema não impõe limite, porque o
custo marginal é zero: a exportação roda no navegador dele. O que precisa
existir é **variedade de layout suficiente** para que postar toda semana não
produza seis peças com a mesma cara. Isso é requisito de produto, não
enfeite — é o que decide se ele continua usando depois do segundo mês.

---

## Os pacotes

Dois níveis. O de cima é onde o dinheiro está, o de baixo existe para o
cliente ter uma porta de entrada e para você poder subir depois.

### Essencial — R$ 1.200 + R$ 250/mês

Site completo, gerador de carrossel, CMS, domínio e hospedagem.
Treinamento de 30 min gravado. Suporte por WhatsApp em dias úteis.
**O cliente produz o próprio conteúdo.**

### Completo — R$ 1.800 + R$ 500/mês

Tudo do Essencial, mais **4 carrosséis prontos por mês**, feitos por você
com o `/carrossel`, no tom e na identidade da marca. Legenda e hashtags
inclusas. Mudanças estruturais inclusas no plano.

### Por que R$ 500/mês se ele pode fazer sozinho?

Essa é a pergunta que o cliente vai fazer, e a resposta é honesta: **ele
pode, mas não vai.** Dono de negócio pequeno não tem tempo nem repertório
para postar com constância. O gerador existe para ele resolver o urgente às
21h de um sábado — não para substituir a produção mensal.

Vender assim também protege você: o cliente que quer autonomia paga o
Essencial e some do seu WhatsApp. O que quer resultado paga o Completo.

### A conta

Com o template pronto, o custo real por cliente no plano Completo:

| Item | Tempo/mês |
|---|---|
| 4 carrosséis com o `/carrossel` | ~2 h |
| Suporte e ajustes | ~1 h |
| **Total** | **~3 h** |

R$ 500 ÷ 3 h ≈ **R$ 165/hora**. Com 20 h/mês reservadas para recorrência,
cabem **6 a 7 clientes** — algo entre **R$ 3.000 e R$ 3.500/mês** de receita
previsível, sem contar implantações novas.

O gargalo não é técnico, é comercial: achar 6 clientes.

**Ressalva de mercado:** R$ 500/mês é preço de clínica, dentista, advogado,
pet shop. Para uma profissional solo de estética, o teto realista costuma
ficar entre R$ 250 e R$ 350. Calibre o pacote pelo porte do cliente, não
pelo entusiasmo dele na primeira conversa.

---

## A linha de montagem

Depois que o template existir, cada cliente novo deve levar **1 a 2 dias**:

1. Clonar o `template-mazyos`
2. Preencher `marca.json` — cores, fontes, logo, contato
3. Escrever `conteudo/*.md` a partir do briefing
4. Jogar as fotos em `public/img/`
5. Deploy no Netlify, apontar domínio
6. Conectar o Tina e convidar o cliente por e-mail
7. Gravar o vídeo de 30 min mostrando as duas telas
8. Entregar

O `/novo-projeto` deve passar a fazer os passos 1 a 4 sozinho.

---

## Ordem de construção

Uma etapa por vez, e **cada uma termina com algo que já dá para vender**.

**Etapa 1 — Refazer a Valéria como template.**
Migrar o site atual para Astro, com o texto saindo para Markdown e a marca
para `marca.json`. O resultado tem que ser visualmente idêntico ao de hoje.
Ela é a cobaia perfeita: não paga, é da família, e vira o case de portfólio.

**Etapa 2 — O gerador de carrossel.**
Portar os layouts que já existem, montar o formulário e a exportação em PNG.
Testar com a Valéria antes de mostrar a qualquer cliente pagante.

**Etapa 3 — O CMS.**
Conectar o Tina. Verificar o limite do plano gratuito **antes** de prometer
qualquer coisa em proposta.

**Etapa 4 — O comercial.**
Contrato, forma de cobrança recorrente (Asaas ou Mercado Pago fazem cobrança
automática por Pix e boleto), página de vendas e o vídeo de treinamento.

**Etapa 5 — O primeiro cliente pagante.**

---

## Riscos e o que verificar antes de vender

| Risco | O que fazer |
|---|---|
| **Limite do Tina gratuito** | Confirmar se é por projeto ou por conta, **antes** da primeira proposta |
| **Cliente quebra o site** | O CMS só expõe campos de texto; layout não fica editável |
| **Suporte vira sanguessuga** | A tabela "conteúdo × estrutura" entra no contrato, assinada |
| **Cliente para de pagar** | Definir por escrito o que acontece: site sai do ar ou congela? Quem fica com o domínio? |
| **Fonte na exportação do PNG** | Auto-hospedar as fontes; testar exportação em celular, que é onde ele vai usar |
| **Você é um só** | Não vender o Completo para mais de 6 ou 7 clientes ao mesmo tempo |

**A decisão mais importante que ainda não foi tomada:** de quem é o domínio.
Registrar no CPF do cliente dá segurança a ele e evita que você vire refém de
uma discussão; registrar no seu facilita a operação. Escolha antes do primeiro
contrato, não depois.
