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
| Valéria Augusto | **Retomado em 08/08/2026.** Site de captação de leads para uma familiar, designer de sobrancelhas. Conversão única: WhatsApp. O que ainda falta perguntar a ela está no `briefing.md`. **Tem repositório git próprio desde 09/08/2026, e remote privado no GitHub desde 27/08/2026** (`Ryan-Augusto08/Valeria`) — 20 commits, 103 arquivos. A pasta segue aqui, mas o MazyOS a ignora: quem versiona é o git de dentro dela | `projetos/Valéria-Augusto/` |
| Rafael Gimenez | **Criado em 18/08/2026.** Cliente novo — dentista (implantodontia e estética) em São José do Rio Preto. Site em produção avançada. **Primeiro carrossel pronto em 23/08/2026** (`conteudo/carrossel-duvidas-implante-2026-08-23/`), à espera do CRO pra publicar. Tem **repositório git próprio com remote privado no GitHub desde 27/08/2026** (`Ryan-Augusto08/RafaelGimenez`) — antes era só local. **Site revisado em 25/09/2026:** portfólio de 12,5 MB para 0,72 MB, seção de dúvidas nova (o mesmo texto do carrossel), `og:` e JSON-LD, e `site/` reorganizada — o que está nessa pasta é público, porque o Netlify publica ela inteira. Guarda **20 fotos** de antes/depois de paciente (master único em `identidade/resultados/` desde 25/09; antes eram 40 arquivos em duas pastas), duas com rosto identificável, e o nome de um paciente conhecido, tudo sem consentimento levantado. A pasta **está no `.gitignore`** da raiz desde 18/08/2026 e nunca foi commitada aqui. **Nunca tornar o repositório dele público**, e pensar duas vezes antes de adicionar foto nova: histórico de git não se apaga | `projetos/Rafael-Gimenez/` |
| Seminovos | **Criado em 23/08/2026 como validação; virou construção em 28/08.** Sistema de gestão + site para loja de seminovos. **Existe sistema de verdade** em `sistema/`: vitrine pública, painel com login, cadastro com FIPE e margem ao vivo, custo de preparação, estoque em cards com filtros, funil de clientes, agenda, meta do mês e troca com carro na venda. **No ar no Railway desde 31/08/2026** — o endereço do serviço não está anotado em lugar nenhum. **A pilha decidida em 23/08 (PHP + Laravel) nunca foi instalada** — ficou Next.js 16 + Drizzle + SQLite, porque a prova que faltava era a prévia do carro no WhatsApp, que é metadado renderizado no servidor. **Virou produto multi-cliente em 29/08**: `CLIENTE` no deploy escolhe um arquivo de `src/config/clientes/`, um serviço do Railway por loja, um banco por loja — bancos separados porque as quatro lojas são concorrentes. **Zero entrevistas feitas** e **nenhuma venda**: a Portuga é o alvo da primeira, e ninguém falou com o dono ainda. Git próprio com remote **privado** (`Ryan-Augusto08/Seminovos`) desde 26/08. **ICE Sistemas é o padrão de fato da cidade** — duas das quatro pagam por ela, o que prova que o nicho já compra a categoria. Nada de nome real vai pro repositório da raiz | `projetos/Seminovos/` |
| Portuga Automóveis | **Criado em 26/08/2026.** Loja de seminovos em Bady Bassitt/SP, dono conhecido do Ryan e do pai. **Alvo da primeira venda — ainda não é cliente: ninguém falou com o dono.** A mensagem de abordagem está pronta desde 27/08 e nunca foi enviada. **A decisão de 26/08 ("conserto do site, não site novo") foi revertida em 28/08**, quando o caminho mais curto até o dono deixou de ser um laudo e passou a ser o site refeito e funcionando. O site novo mora em `projetos/Seminovos/sistema` com os 26 carros reais importados e está no ar desde 31/08/2026; o `plano-conserto.md` daqui está marcado como superado, mas o diagnóstico dos quatro defeitos continua valendo como argumento. O laudo é o artefato `Laudo Portuga Automóveis`. No `.gitignore` com git próprio e remote **privado** no GitHub (`Ryan-Augusto08/PortugaAutomoveis`) | `projetos/Portuga-Automoveis/` |
| Escritório Contábil | **Criado em 18/08/2026.** Pai do Ryan, contador que trabalha sozinho. **Problema de capacidade, não de demanda** — captação funciona, a entrega é que não vaza. Marketing está fora de escopo. Em fase de diagnóstico: aplicar `diagnostico/roteiro-entrevista.md` antes de propor qualquer coisa. Pasta ignorada pelo git desde o primeiro dia (carteira de clientes é dado sob sigilo). **Sem repositório remoto por decisão, não por esquecimento** (27/08/2026): a pasta ainda não tem conteúdo que justifique backup. Quando tiver, é repositório privado como os outros. Nome da pasta é provisório | `projetos/Escritorio-Contabil/` |

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
