---
name: seguranca
description: >
  Revisão de segurança de site e sistema de um projeto: dependências com falha conhecida,
  segredos expostos, rotas e ações públicas sem login, login sem limite de tentativas,
  upload e entrega de arquivos, formulários sem antispam, cabeçalhos de segurança e dado
  pessoal. Entrega uma lista por gravidade, corrige o que o usuário aprovar e testa no
  site rodando. Use quando o usuário pedir "revisão de segurança", "segurança do site",
  "tá seguro?", "auditoria", "checa vulnerabilidade", "antes de publicar", "/seguranca",
  ou antes de pôr no ar um sistema com login ou dado de cliente.
---

# /seguranca — Revisão de segurança de site e sistema

Revisa um projeto de `projetos/<nome>/`, aponta o que está exposto, corrige o
que o usuário aprovar e prova que a correção funciona. Vale pra sistema com
login e banco (Next.js, PHP) e pra site estático.

**A regra que governa tudo:** o navegador é território do inimigo. Toda
validação, toda checagem de login e toda decisão sobre o que alguém pode ver
acontece no servidor. Campo escondido, id na URL, tipo de arquivo, cabeçalho
— tudo que vem do cliente pode ter sido escrito à mão.

---

## Passo 0 — Escopo

Descobrir, sem perguntar o que dá pra ler:

- Qual projeto (a pasta em que o terminal está, ou o que o usuário disse).
- **Sistema ou site estático?** Sistema tem login, banco ou formulário que
  grava; estático é HTML publicado. O estático pula os passos 3 a 6.
- A pilha: `package.json` (Next.js), `Dockerfile`/`*.php` (PHP), `netlify.toml`.
- Onde roda em produção e se está no ar (o `CLAUDE.md` e o `DEPLOY.md` do
  projeto dizem). Revisão sem saber o que está publicado é revisão de papel.
- **O repositório é público ou privado?** Conferir antes de escrever qualquer
  achado em arquivo: `curl -s -o /dev/null -w "%{http_code}" https://api.github.com/repos/<dono>/<repo>`
  — `200` sem login é público. A raiz do MazyOS é pública.

## Passo 1 — Dependências

A falha mais grave costuma estar aqui, e é a mais barata de corrigir.

- **Node:** `npm audit --omit=dev` e a versão instalada de verdade
  (`node -p "require('next/package.json').version"`), não a do `package.json`.
  Pra cada falha crítica, conferir **se o recurso vulnerável é usado** — e numa
  rota pública. "Next.js tem RCE no `next/og`" vira 🔴 se existe uma rota
  pública com `ImageResponse`.
- **PHP:** a versão da imagem no `Dockerfile` (`php:8.2-apache` é uma linha,
  não uma versão: o patch depende de quando a imagem foi baixada). Rebuild sem
  cache pega o patch.
- Ler a memória de radar de segurança, se existir: ela pode já ter avisado.
- Atualizar só dentro da mesma versão grande sem perguntar o impacto. Mudança
  de versão grande é decisão do usuário.

## Passo 2 — Segredos

- `.env`, chave de API, senha de banco: `git check-ignore -v <arquivo>` tem que
  responder que está ignorado. Se já foi commitado, **o histórico guarda** —
  trocar a credencial é obrigatório, apagar o arquivo não basta.
- Procurar segredo escrito no código:
  `git grep -nIE "(api[_-]?key|secret|senha|password|token)\s*[:=]\s*['\"][^'\"]{8,}"`.
- Segredo de sessão: tem que existir, ser longo (32+ caracteres) e o sistema
  tem que **falhar alto** sem ele, nunca subir com um padrão.

## Passo 3 — Superfície pública (sistema)

Listar **tudo que alguém de fora consegue chamar**, e pra cada item responder:
exige login? valida no servidor? confere os ids que recebe?

- **Next.js:**
  - `find src/app -name route.ts` — cada um é um endereço público.
  - Arquivos com `"use server"` **no topo**: toda função *exportada* vira
    endereço chamável de fora, mesmo que só a página use. Função de leitura
    sem checar sessão dentro de arquivo `"use server"` é vazamento. Correção:
    tirar o `"use server"` do topo e marcar só as ações, dentro delas.
  - **Cuidado com falso positivo:** `grep -l '"use server"'` também pega o
    texto num comentário. Confirmar que é a primeira instrução do arquivo.
  - Componente `"use client"` importando o banco (`@/db`) é falha; importar
    só um *tipo* do schema não é.
- **PHP:** cada arquivo em `api/` é um endereço. Conferir sessão no começo de
  cada um que não é público, e consulta com parâmetro preparado (nunca
  variável colada no SQL).
- **Página protegida:** a checagem mora no servidor (layout, middleware ou
  topo do PHP). Esconder o link do menu não é controle de acesso.
- **Id vindo do cliente:** antes de usar, conferir que o registro existe e que
  essa pessoa pode mexer nele (e, em sistema com uma loja por banco, que o
  banco é o certo).

## Passo 4 — Login

| Conferir | Certo |
|---|---|
| Senha guardada | `bcrypt`/`password_hash`, nunca texto nem MD5/SHA puro |
| Mensagem de erro | Uma só pra e-mail inexistente e senha errada |
| Tempo de resposta | Roda o hash mesmo sem usuário, pra não revelar quem existe |
| Comparação de assinatura/token | Tempo constante (`timingSafeEqual`, `hash_equals`) |
| Cookie de sessão | `httpOnly`, `secure` em produção, `sameSite` |
| **Limite de tentativas** | Trava por e-mail **e** por IP, separados |

Sobre o limite de tentativas, três armadilhas que já apareceram:

- Só por e-mail, o atacante testa uma senha comum em todas as contas; só por
  IP, ele troca de IP. Os dois.
- O IP atrás de proxy (Railway, Netlify) vem no `x-forwarded-for`, e **o
  primeiro item é escrito pelo cliente**. O IP real é o que o proxy acrescenta
  no **fim**. Confirmar o comportamento do proxy em produção.
- Durante a trava, não conferir a senha: senão o robô ainda descobre que
  acertou, só que mais devagar. E não dizer quantos minutos faltam.

## Passo 5 — Arquivos

- **Upload:** exige login; limite de tamanho; tipo conferido no servidor (o
  `type` que o navegador manda é declarado, não verificado — bibliotecas como o
  `sharp` decidem pelo conteúdo); nome gerado pelo servidor, nunca o do arquivo
  enviado.
- **Entrega de arquivo por rota:** resolver o caminho e conferir que continua
  dentro da pasta (`resolve(...)` + `startsWith(pasta + sep)`). Comparar
  string antes de resolver deixa passar `..%2f`. Testar pedindo um arquivo
  **com extensão permitida** que esteja fora da pasta (ex: uma imagem de
  `public/`): `curl http://localhost:<porta>/fotos/..%2f..%2fpublic%2f<imagem>.png`
  tem que dar 404. Testar com `package.json` não prova nada — dá 404 só porque
  `.json` não está na lista.
- Lista fechada de extensões servidas.

## Passo 6 — Formulários públicos

- Validação no servidor, de novo, mesmo com `required` no HTML.
- Escolhas (forma de pagamento, parcelas, id de produto) aceitas só de uma
  **lista fechada**; texto livre com limite de tamanho.
- **Antispam:** campo-armadilha fora da tela (não `display:none`), sem Tab e
  sem autocompletar. Preenchido = robô: responder igual a um envio de verdade e
  **não gravar** — devolver erro ensina o robô qual campo deixar vazio.
- Banco fora do ar não pode virar tela de erro pro cliente: mostrar o
  "recebemos" e o WhatsApp.

## Passo 7 — Cabeçalhos

`curl -sI <url>` e conferir:

| Cabeçalho | Valor seguro pra começar |
|---|---|
| `Content-Security-Policy` | `frame-ancestors 'none'` (contra clickjacking) |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |

Onde configurar: `headers()` no `next.config.ts`; `[[headers]]` no
`netlify.toml`; `Header set` no Apache/`.htaccess`.

**Não colar CSP completa** (lista de scripts permitidos) sem testar página por
página: quebra scripts embutidos do framework, mapas e fontes de jeitos que só
aparecem no navegador do cliente. Se vier, é com `nonce`.

`Permissions-Policy` com `camera=()` **não** impede `<input type="file">` de
abrir a câmera do celular — só bloqueia acesso direto por script.

## Passo 8 — Dado pessoal

- O que o sistema guarda de pessoa: nome, telefone, e-mail, foto, documento.
  Menor de idade e dado de saúde pesam mais.
- Repositório com dado pessoal ou de cliente: **privado**, e a pasta no
  `.gitignore` da raiz se a raiz for pública. Conferir com `git check-ignore`.
- Foto com rosto, nome de paciente/cliente: existe consentimento? Histórico de
  git não se apaga.
- Backup: onde está o banco em produção, e existe cópia?

---

## Passo 9 — Relatório

Antes de escrever, **reconferir cada suspeita no código** — a varredura por
texto dá falso positivo. Só entra no relatório o que foi confirmado.

Formato, em ordem de gravidade:

```
## Revisão de segurança — <projeto>

**🔴 Crítico** — <o que é>, <onde>, <por que é grave aqui> (usado em rota pública? exposto sem login?)
**🟠 Alto** — ...
**🟡 Médio** — ...
**⚪ Baixo** — ...
**🟢 O que está certo** — lista curta, pra não "consertar" o que funciona.
```

Gravidade é sobre **este** sistema, não sobre a falha em abstrato: RCE numa
biblioteca cujo recurso não é usado cai de nível; falha média numa rota pública
com dado de cliente sobe.

Depois, perguntar quais corrigir (multiSelect), uma opção por grupo.

## Passo 10 — Correção e prova

- Parar os servidores locais antes de atualizar dependência.
- Corrigir, então **provar no site rodando**, não só no build:
  - `tsc`, lint e build de produção;
  - subir o servidor e testar o caminho atacado (5 senhas erradas travam; a
    armadilha não grava; `..%2f` dá 404; `curl -sI` mostra os cabeçalhos);
  - testar o caminho de quem é legítimo (login certo entra; formulário real
    grava) — correção de segurança que barra o cliente é bug.
- Apagar todo registro de teste do banco.
- Erro de lint que apareceu só porque a atualização deixou a regra mais rígida,
  em arquivo não tocado: anotar, não misturar com a correção.

## Passo 11 — Fechamento

- **Publicar em produção só com o ok do usuário.** E lembrar: se o servidor
  em produção ficou atrás, ele continua vulnerável até o deploy.
- Registrar no `_memoria/estrategia.md` **do projeto** o que ficou pendente
  (o que não foi corrigido e por quê). Sem senha, sem endereço de produção, sem
  detalhe explorável em repositório público.
- Oferecer `/salvar`.

## Regras

- Não afirmar sem ter conferido no código. "Parece vulnerável" não entra.
- Não rodar ferramenta de ataque contra site que está no ar. Testa-se no
  servidor local.
- Não colocar segredo, senha gerada ou endereço de produção em arquivo que vai
  pra repositório público — nem no relatório, nem na memória.
- Senha trocada ou gerada vai só na resposta pro usuário, nunca em arquivo.
- Correção de segurança não muda comportamento que o cliente vê, a não ser o
  necessário (a mensagem de trava, por exemplo). Se mudar, avisar.
