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
aberto dentro dela** (ex: `projetos/NutraBalance/`) — assim as skills
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
| NutraBalance | Site de acompanhamento nutricional — TCC do Ryan. **Chamava-se NutriBalance até 22/08/2026**, quando foi renomeado: pasta, banco MySQL, junction do XAMPP, chave do localStorage e logo. Os nomes externos **não** acompanharam — repositório no GitHub, projeto no Netlify e serviço no Railway seguem com o nome antigo | `projetos/NutraBalance/` |
| Valéria Augusto | **Retomado em 08/08/2026.** Site de captação de leads para uma familiar, designer de sobrancelhas. Conversão única: WhatsApp. O que ainda falta perguntar a ela está no `briefing.md`. **Tem repositório git próprio desde 09/08/2026, mas só local** — sem remote configurado, nada nunca subiu pro GitHub (verificado em 16/08/2026). A pasta segue aqui, mas o MazyOS a ignora e não versiona nada dela: se o disco se perder, o projeto se perde junto | `projetos/Valéria-Augusto/` |
| Rafael Gimenez | **Criado em 18/08/2026.** Cliente novo — dentista (implantodontia e estética) em São José do Rio Preto. Site em produção avançada. **Primeiro carrossel pronto em 23/08/2026** (`conteudo/carrossel-duvidas-implante-2026-08-23/`), à espera do CRO pra publicar. Tem **repositório git próprio, local, sem remote** — nada nunca saiu da máquina, e é pra continuar assim: guarda 20 fotos de antes/depois de paciente e o nome de um paciente conhecido, sem consentimento levantado. A pasta **está no `.gitignore`** da raiz desde 18/08/2026 e nunca foi commitada aqui (verificado em 23/08). O risco do repo público está fechado; o que segue aberto é **backup** — sem remote, se o disco se perder o projeto vai junto | `projetos/Rafael-Gimenez/` |
| Seminovos | **Criado em 23/08/2026.** Sistema de gestão para loja de carros usados — estoque, funil de interessados, vendas e margem por carro. **Não tem cliente: está em validação**, e nada de código de produção é escrito até o `validacao/roteiro-entrevista.md` rodar com três lojas. Pilha decidida (PHP + MySQL com Laravel), **ainda não instalada**. **Saiu do repo público em 26/08/2026** e ganhou git próprio com remote **privado** no GitHub (`Ryan-Augusto08/Seminovos`). O gatilho: entraram **quatro lojas reais de Bady Bassitt/SP** (Portuga, M9 Autos, Avenida e Borboleta), concorrentes entre si, todas com dono conhecido do Ryan e do pai. **ICE Sistemas é o padrão de fato da cidade** — duas das quatro pagam por ela, o que prova que o nicho já compra a categoria. A validação passou a entrar pela porta do site, não da gestão. Nada de nome real vai pro repositório da raiz | `projetos/Seminovos/` |
| Portuga Automóveis | **Criado em 26/08/2026.** Cliente novo — loja de seminovos em Bady Bassitt/SP, dono conhecido do Ryan e do pai. **Conserto do site existente, não site novo**: o estoque vive em custom post types do JetEngine e migrar custaria mais que o ganho. Quatro consertos levantados em `plano-conserto.md`, e o laudo mostrado ao dono é o artefato `Laudo Portuga Automóveis`. É a porta de entrada da validação do Seminovos — as perguntas do roteiro rodam de dentro da loja, durante o trabalho de site. No `.gitignore` com git próprio e remote **privado** no GitHub (`Ryan-Augusto08/PortugaAutomoveis`) | `projetos/Portuga-Automoveis/` |
| Escritório Contábil | **Criado em 18/08/2026.** Pai do Ryan, contador que trabalha sozinho. **Problema de capacidade, não de demanda** — captação funciona, a entrega é que não vaza. Marketing está fora de escopo. Em fase de diagnóstico: aplicar `diagnostico/roteiro-entrevista.md` antes de propor qualquer coisa. Pasta ignorada pelo git desde o primeiro dia (carteira de clientes é dado sob sigilo). Nome da pasta é provisório | `projetos/Escritorio-Contabil/` |

O que fica na raiz é só infraestrutura do MazyOS: as regras desse arquivo,
o `README.md`, as skills em `.claude/skills/`, os templates em `templates/`,
as drop zones genéricas `saidas/` e `scripts/`, e o `produto/`, que guarda o
plano do MazyOS (`PRODUTO.md`) e a lista de pendências (`TAREFAS.md`).

**Uma exceção que contraria a regra do projeto autocontido:** o
`netlify.toml` da raiz é **do NutraBalance**, não genérico — publica
`projetos/NutraBalance/site` e faz proxy de `/api/` e `/uploads/` pro
backend no Railway. Está na raiz porque o Netlify só lê o arquivo dali.
Ao mexer em deploy, é nesse arquivo, e ele afeta um projeto só.

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
