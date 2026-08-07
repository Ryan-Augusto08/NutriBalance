# MazyOS — Sistema operacional do negócio

Sua empresa roda em cima desse arquivo. Aqui ficam as regras de operação
do MazyOS — como o Claude lê o contexto, aprende com correções, mantém
tudo atualizado e cria skills novas conforme a operação evolui.

Esse arquivo é editável. Quando o `/instalar` rodar, ele complementa o
final dessa página com as regras específicas do seu negócio.

---

## Contexto do negócio

**A memória mora dentro de cada projeto, não aqui na raiz.** Cada pasta em
`projetos/` é autocontida: leva o próprio `_memoria/` e a própria
`identidade/`. A raiz guarda só as regras de operação (esse arquivo), as
skills e os templates.

No início de toda conversa sobre um projeto, ler os arquivos dele:

1. `_memoria/empresa.md` — quem é o usuário, o que faz, como funciona o negócio
2. `_memoria/preferencias.md` — tom de voz, estilo de escrita, o que evitar
3. `_memoria/estrategia.md` — foco atual, prioridades, prazos

Usar essas informações como base pra qualquer resposta ou decisão. Ao
sugerir prioridades, formatos ou abordagens, considerar o foco atual
descrito em `estrategia.md`.

Pra qualquer tarefa visual (carrossel, post, landing page), consultar
`identidade/design-guide.md` como referência de estilo.

Esses caminhos são relativos à pasta do projeto. **Trabalhe com o terminal
aberto dentro dela** (ex: `projetos/NutriBalance/`) — assim as skills
encontram o contexto certo e o `CLAUDE.md` do projeto carrega junto com
esse. Se a conversa começar na raiz e o assunto for um projeto específico,
ler `projetos/<nome>/_memoria/` explicitamente.

Não é necessário listar o que foi lido nem confirmar a leitura. Apenas
usar o contexto naturalmente.

---

## Fluxo de trabalho

Antes de executar qualquer tarefa, verificar se existe skill relevante
em `.claude/skills/`. Se encontrar, seguir as instruções da skill. Se
não encontrar, executar a tarefa normalmente.

Ao concluir uma tarefa que não tinha skill mas parece repetível (o
usuário provavelmente vai pedir de novo no futuro), perguntar:

> "Isso pode virar uma skill pra próxima vez. Quer que eu crie?"

Não perguntar pra tarefas pontuais ou perguntas simples. Só quando o
padrão de repetição for claro.

---

## Aprender com correções

Quando o usuário corrigir algo, melhorar uma resposta ou dar uma
instrução que parece permanente (frases como "na verdade é assim", "não
faça mais isso", "prefiro assim", "sempre que...", "evita...", "da
próxima vez..."), perguntar:

> "Quer que eu salve isso pra não precisar repetir?"

Se sim, identificar onde faz mais sentido salvar:

- **Sobre o negócio** (clientes, serviços, mercado) → `_memoria/empresa.md`
- **Sobre preferências e estilo** (tom de voz, formato, o que evitar) → `_memoria/preferencias.md`
- **Sobre prioridades e foco** (projetos, metas, prazos) → `_memoria/estrategia.md`
- **Regra de comportamento nessa pasta** → próprio `CLAUDE.md`

Salvar com uma linha nova clara, sem reformatar o arquivo inteiro.
Confirmar mostrando a linha adicionada.

Não perguntar se a correção for óbvia de contexto imediato (ex: "na
verdade o arquivo se chama X"). Só perguntar quando a informação tiver
valor duradouro.

---

## Manter contexto atualizado

Ao terminar uma tarefa que mudou algo relevante (cliente novo, skill
nova, mudança de foco, processo novo, ferramenta instalada, estrutura
alterada), perguntar:

> "Isso mudou algo no teu contexto. Quer que eu atualize a memória?"

Se sim, identificar o que atualizar:

- **Cliente, serviço, ferramenta, equipe** → `_memoria/empresa.md`
- **Mudança de prioridade ou foco** → `_memoria/estrategia.md`
- **Tom ou estilo** → `_memoria/preferencias.md`
- **Pasta, regra de organização, skill criada** → `CLAUDE.md`
- **Visual (cores, fontes, logo)** → `identidade/design-guide.md`

Mostrar o que vai mudar antes de salvar. Não reformatar o arquivo
inteiro, só adicionar ou editar a linha relevante.

**Quando NÃO perguntar:**
- Tarefas pontuais sem impacto no contexto (escrever um email avulso, criar um post)
- Perguntas simples ou conversas sem ação
- Mudanças já salvas pelo bloco "Aprender com correções"

**Dica:** rode `/atualizar` pra uma varredura completa quando houver dúvida.

---

## Criação de skills

Quando o usuário pedir skill nova:

1. Verificar se existe template relevante em `templates/skills/`. Se
   existir, usar como base e adaptar pro contexto
2. Perguntar se é específica desse projeto ou útil em qualquer:
   - Específica → `.claude/skills/nome-da-skill/SKILL.md` (local)
   - Universal → `~/.claude/skills/nome-da-skill/SKILL.md` (global)
3. Ler `_memoria/empresa.md` e `_memoria/preferencias.md` pra calibrar
   o conteúdo da skill ao contexto do negócio
4. Se a skill precisar de arquivos de apoio (templates, exemplos),
   criar dentro da pasta da skill
5. Seguir o fluxo da skill-creator nativa do Claude Code

---

## Projetos

Cada trabalho vive em `projetos/<Nome>/`, autocontido — com o próprio
`CLAUDE.md`, `briefing.md`, `_memoria/` e `identidade/`. As regras do
`CLAUDE.md` do projeto sobrescrevem as daqui quando houver conflito.

**Projetos:**

| Projeto | O que é | Pasta |
|---|---|---|
| NutriBalance | Site de acompanhamento nutricional — TCC do Ryan | `projetos/NutriBalance/` |
| Valéria Augusto | **Pausado em 06/08/2026.** Site de captação de leads para uma familiar. Depende de informações que só ela tem — o `briefing.md` guarda o que perguntar | `projetos/Valéria-Augusto/` |

O que fica na raiz é só infraestrutura do MazyOS: as regras desse arquivo,
as skills em `.claude/skills/`, os templates em `templates/`, e as drop
zones genéricas `saidas/` e `scripts/`.

### Ao criar projeto novo

Usar o `/novo-projeto`. Dois pontos que já morderam antes e valem conferir
em qualquer projeto que envolva código:

1. **Caminhos fixos fora do repositório.** Symlinks e junctions (ex: o
   `htdocs` do XAMPP) guardam o caminho como texto e não acompanham
   pasta movida — o serviço quebra sem erro aparente de código.
2. **Regras do `.gitignore` ancoradas em caminho.** Ao mover uma pasta,
   conferir se o que era protegido continua protegido, com
   `git check-ignore -v <arquivo>`. Vale principalmente pra credencial e
   dado pessoal.

## Ferramentas conectadas

- [ ] Notion
- [ ] Canva — servidor MCP configurado, mas ainda pendente de autorização
      (fazer pelas configurações de conectores do claude.ai)
- [ ] Google Calendar

*(Marcar conforme for instalando os MCPs)*
