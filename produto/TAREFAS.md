# Tarefas do produto

> Lista corrida. A mais recente fica no topo. Ao concluir, marcar `[x]` e
> anotar o que mudou — não apagar, o histórico serve de registro.

---

## 19/08/2026 — Etapa 1: extrair o template do site da Valéria

**Objetivo do dia:** transformar o site da Valéria, que hoje é uma peça
artesanal, no molde que servirá todos os clientes. Ao fim, o site tem que
estar **visualmente idêntico** ao de hoje — a mudança é por dentro.

Ver `PRODUTO.md` para o contexto completo da arquitetura.

### Decisão já tomada

Começar pela **Valéria**, não pelo Rafael. Ela é cobaia sem risco: não paga,
é da família, e o site dela não tem prazo de cliente correndo.

**Mas desenhar o template já pensando no Rafael.** O site dele tem a mesma
anatomia e vai ser o segundo a usar isso. Se os campos certos existirem desde
o começo, o segundo cliente custa uma tarde em vez de uma semana.

Campos que o Rafael precisa e a Valéria não tem — **prever desde já**:

- `cro` — número de registro no conselho (obrigatório em publicidade
  odontológica; hoje não existe no site dele)
- `galeria` com curadoria — ele tem 40 fotos, o site mostra 20, o certo são
  ~6 escolhidas
- `pilares` — a faixa de 3 provas abaixo do topo (feita nele em 18/08)
- `especialidades` — lista com título e descrição

### Passos

- [x] **0. Instalar o Node.** ✅ Feito em 18/08/2026 — Node **v24.19.0** e
      npm **11.17.0**, em `C:\Program Files\nodejs\`.

      ⚠️ **Reabrir o VS Code antes de começar.** Terminal já aberto não
      enxerga o Node: o PATH só é lido na abertura. Se `node --version` disser
      que o comando não existe, é isso — não é falha de instalação.

      *Consequência para o `/carrossel`:* a skill diz que esta máquina não tem
      Node e manda usar Edge headless. Agora tem. O Edge continua funcionando
      e não precisa ser trocado com pressa, mas quando o template estiver de
      pé vale reavaliar e atualizar a skill.

- [ ] **1. Criar o repositório `template-mazyos`** — separado dos projetos.
      É produto, não cliente.

- [ ] **2. Subir um Astro vazio** e confirmar que builda e sobe no Netlify
      antes de portar qualquer conteúdo. Não misturar "aprender a
      ferramenta" com "migrar o site".

- [ ] **3. Extrair o `marca.json` da Valéria.** A paleta já está pronta em
      `projetos/Valéria-Augusto/identidade/design-guide.md`:
      rosé `#F2DFE1`, rosé claro `#FAF3F4`, tinta `#2B2933`,
      dourado `#C0A87F`, dourado-texto `#7F5F26`, cinza `#6B6B72`.
      Fontes: Cormorant Garamond (títulos) + Jost (corpo).
      Incluir também: telefone, @, endereço, logo.

- [ ] **4. Tirar o texto do `index.html` para Markdown.** São 495 linhas com
      o conteúdo cravado dentro da estrutura. Uma seção por arquivo.

- [ ] **5. Montar os componentes** a partir das seções que já existem: topo,
      faixa de credibilidade, serviços, portfólio, quem sou, onde atendo,
      rodapé.

- [ ] **6. Comparar lado a lado** com o site atual. Se houver diferença
      visual, é bug — o objetivo desta etapa é paridade, não redesenho.

### Cuidados que já custaram tempo antes

- **Algarismos do Cormorant.** Ele usa figuras antigas por padrão: "2011"
  sai com os dígitos rebaixados e parece defeito. Corrigir no CSS base do
  template com `font-variant-numeric: lining-nums`. Já mordeu no carrossel
  (17/08) e no site do Rafael (18/08) — no template resolve de uma vez.

- **Logo com fundo chapado.** Os PNGs da Valéria têm o rosé assado no fundo,
  porque o kit veio só em JPEG. O template precisa aceitar **duas versões**
  de logo (uma para fundo claro, uma para escuro). O `preparar-logo.ps1` em
  `marketing/conteudo/carrossel-tecnicas-sobrancelha-2026-08-17/` gera as
  duas.

- **Nada de branco puro** onde a marca não tem branco. No carrossel isso
  destoou na hora. O template deve tirar os fundos do `marca.json`, nunca
  usar `#FFF` por padrão.

### Não fazer amanhã

O gerador de carrossel (Etapa 2) e o CMS (Etapa 3). Uma etapa por vez, e
cada uma termina com algo que já dá para mostrar.

---

## Pendências que não são do dia, mas travam venda

- [ ] **Verificar o limite do plano gratuito do TinaCMS** — se é por projeto
      ou por conta. Precisa estar respondido **antes** da primeira proposta,
      porque muda a margem.
- [ ] **Decidir de quem é o domínio** — CPF do cliente ou seu. Definir antes
      do primeiro contrato, não depois.
- [ ] **Escrever o contrato**, com a tabela "conteúdo × estrutura" do
      `PRODUTO.md` dentro dele.
- [ ] **Definir o que acontece se o cliente parar de pagar** — site sai do ar
      ou congela?

---

## Riscos abertos (não são tarefa, são vigilância)

- ⚠️ **O repositório da raiz do MazyOS é público**
  (`github.com/Ryan-Augusto08/NutriBalance`, verificado em 18/08/2026) e a
  pasta `projetos/Rafael-Gimenez/` **não está no `.gitignore`**. São 40 fotos
  de paciente, duas com rosto identificável. **Não commitar essa pasta** até
  decidir entre ignorá-la, dar repositório próprio a ela, ou tornar o
  repositório privado.
- ⚠️ **Consentimento dos pacientes do Rafael** não foi levantado. A
  Resolução CFO-196/2019 permite antes/depois, mas exige autorização de cada
  paciente. As 20 fotos já estão publicadas no site.
