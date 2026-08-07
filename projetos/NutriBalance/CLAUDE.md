# NutriBalance — TCC

> Pasta dedicada, criada em 06/08/2026. Projeto **autocontido**: carrega a
> própria memória e a própria identidade visual. As instruções daqui
> sobrescrevem as da raiz quando houver conflito.

## Sobre

Site de acompanhamento nutricional parecido com o MyFitnessPal, sem a
funcionalidade de leitura/registro de alimento por código de barras. É o
Trabalho de Conclusão de Curso do Ryan, 3º ano do Ensino Médio integrado ao
curso de Desenvolvimento de Sistemas.

## Tipo

Projeto acadêmico (TCC), não uma empresa comercial. Isso pesa na seriedade
exigida do tom de escrita em qualquer material gerado.

---

## Contexto do projeto

No início de toda conversa sobre o NutriBalance, ler:

1. `_memoria/empresa.md` — o que é o projeto, pilha técnica, ferramentas
2. `_memoria/preferencias.md` — tom de voz, estilo de escrita, o que evitar
3. `_memoria/estrategia.md` — foco atual, prioridades, pendências

Para qualquer tarefa visual, consultar `identidade/design-guide.md`.

Esses arquivos ficam **dentro desta pasta**, não na raiz do MazyOS. Como os
caminhos são relativos, trabalhe com o terminal aberto aqui dentro —
`projetos/NutriBalance/` — para que as skills encontrem o contexto certo.

Não é necessário listar o que foi lido nem confirmar a leitura.

---

## Estrutura

- `site/` — o site em si: front em HTML/CSS/JS (módulos ES) e a API PHP em `site/api/`
- `banco/` — esquema MySQL consolidado (`nutribalance_completo.sql`), migrações e o importador da TACO
- `dados/` — planilha da TACO 4ª edição (fonte dos alimentos)
- `marketing/` — documentação técnica e material de apresentação do TCC
- `_memoria/` — contexto do projeto (empresa, preferências, estratégia)
- `identidade/` — cores, tipografia, logo e padrão visual

## Ambiente local

O site precisa ser servido pelo Apache — o PHP consulta o MySQL e os módulos
ES do JavaScript só carregam por `http://`. Existe uma *junction* no `htdocs`
do XAMPP apontando para a pasta `site/`:

```
D:\Xampp\htdocs\nutribalance  ->  C:\Users\ryand\OneDrive\Desktop\MazyOS\projetos\NutriBalance\site
```

Com Apache e MySQL ligados, o site responde em **http://localhost/nutribalance/**.

**Atenção:** a junction guarda o caminho como texto fixo. Se esta pasta for
movida ou renomeada, o site para de abrir no localhost sem nenhum erro
aparente de código. Nesse caso, recriar o link:

```
rmdir "D:\Xampp\htdocs\nutribalance"
mklink /J "D:\Xampp\htdocs\nutribalance" "<novo caminho>\site"
```

Já aconteceu uma vez, em 06/08/2026, quando a pasta MazyOS saiu de
`Desktop\TCC\` para `Desktop\`.

## Arquivos que nunca vão pro Git

Protegidos pelo `.gitignore` da raiz. Se esta pasta mudar de lugar, conferir
se as regras continuam casando (`git check-ignore -v <arquivo>`):

- `site/api/email_config.php` — senha de app do Gmail usada no envio de e-mail
- `site/uploads/fotos/*` — fotos de perfil enviadas por usuários (dado pessoal)
- `dados/*` — planilha da TACO

---

## Quem sou

Sou Ryan, aluno do 3º ano do Ensino Médio integrado ao curso de
Desenvolvimento de Sistemas. O NutriBalance é meu TCC — um site que facilita
a vida de quem quer ter hábitos saudáveis.

## O que produzo

- Site NutriBalance (dashboard de kcal, macros e refeições diárias)
- Documentação e material de apresentação do TCC

## Minha audiência

Pessoas interessadas em cuidar da saúde e melhorar fisicamente — seja
ganhando, perdendo ou mantendo peso. Nesse momento, também a banca
avaliadora do TCC.

## Tom de voz

Direto, formal e sério — sem emoji, sem gírias, sem tom jovial. Qualquer
coisa que soe "escrita por IA" (emoji, informalidade excessiva) compromete
a seriedade esperada de um trabalho acadêmico.

Evitar: emoji em contexto formal, linguagem casual demais.

## Posicionamento

NutriBalance entrega o essencial do MyFitnessPal para hábitos saudáveis,
sem a funcionalidade de leitura/registro por código de barras.

## Regras do sistema

- Projeto ainda sem equipe ativa — dois colegas estão nominalmente no
  projeto mas não participaram até agora
- Sem gargalo ou rotina repetitiva identificada ainda (fase inicial)
- Logo do NutriBalance salva em `identidade/` desde 20/07/2026, em duas
  variantes — ver a seção Logo do `identidade/design-guide.md`

---

## Convenção de código — português

Todo o código do NutriBalance é escrito em **português**: variáveis, funções,
constantes, nomes de arquivo e pasta, ids de HTML, classes de CSS e colunas do
banco. É como o Ryan programa na escola, e a banca do TCC lê o código — misturar
os dois idiomas passa impressão de descuido.

**Estilo por camada:**

| Camada | Estilo | Exemplo |
|---|---|---|
| Variáveis e funções JS/PHP | `camelCase` | `carregarDados`, `totaisDoDia`, `$metaKcal` |
| Constantes | `MAIUSCULA_SNAKE` | `FATOR_ATIVIDADE`, `VERSAO_DADOS` |
| Colunas e tabelas do banco | `snake_case` | `meta_kcal`, `cintura_cm` |
| ids de HTML e classes de CSS | `kebab-case` | `lista-refeicoes`, `.grafico-card` |

**Sem acento e sem cedilha em identificadores.** Escrever `refeicao`, não
`refeição`. O JS aceita acento em nome de variável, mas quebra em seletor de
CSS, chave de `localStorage` e coluna de SQL, e vira problema de encoding entre
PHP/MySQL/navegador. Acento continua normal em **texto exibido na tela e em
comentários** — isso não muda.

**Fica em inglês só o jargão consolidado** (traduzir só piora): `id`, `kcal`,
`iso`, `svg`, `json`, `html`, `hash`, `tdee`, `uid`, `modal`, `link`, `app`, e
as APIs do navegador/PHP (`getElementById`, `addEventListener`, `localStorage`,
`fetch`, `password_hash`).

**Glossário canônico** — usar sempre o mesmo termo. O maior risco numa base
traduzida é sair `refeicao` num arquivo e `comida` no outro:

| Inglês | Português | | Inglês | Português |
|---|---|---|---|---|
| meal | `refeicao` | | goal | `meta` |
| food | `alimento` | | profile | `perfil` |
| chart | `grafico` | | state | `estado` |
| progress | `progresso` | | data (dados) | `dados` |
| add | `adicionar` | | remove / del | `remover` |
| save | `salvar` | | load | `carregar` |
| empty | `vazio` | | totals / sum | `totais` / `somar` |
| render / draw | `mostrar` / `desenhar` | | handle | `tratar` |
| show / hide | `mostrar` / `esconder` | | preview | `previa` |
| bmr | `tmb` | | escapeHtml | `escaparHtml` |
