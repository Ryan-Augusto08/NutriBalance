# Colocar o NutriBalance no ar

Passo a passo da publicação. O site fica dividido em duas hospedagens porque
nenhuma das duas faz o trabalho da outra: o Netlify serve arquivo estático e
não executa PHP; o Railway executa PHP e roda o MySQL.

```
                    ┌──────────────────────────────────────┐
   navegador ─────► │  Netlify   nutribalance.netlify.app  │
                    │  index.html, css/, js/, img/         │
                    └───────────────┬──────────────────────┘
                                    │  /api/*  e  /uploads/*
                                    │  (proxy — o navegador não vê)
                                    ▼
                    ┌──────────────────────────────────────┐
                    │  Railway                             │
                    │  ┌────────────────┐  ┌─────────────┐ │
                    │  │ PHP 8.2+Apache │──│ MySQL       │ │
                    │  │ api/, uploads/ │  │ 4 tabelas   │ │
                    │  └────────────────┘  └─────────────┘ │
                    └──────────────────────────────────────┘
```

O navegador conversa **só** com o Netlify. As chamadas a `/api/` são repassadas
nos bastidores pelo `netlify.toml`. Isso não é um detalhe de organização: é o
que faz o cookie de sessão do PHP continuar funcionando. Se o JavaScript
chamasse o Railway direto, seria outro domínio, e o login exigiria CORS e
`SameSite=None` para não quebrar.

---

## Antes de começar

Contas necessárias, as duas gratuitas e com login pelo GitHub:

- https://railway.app
- https://app.netlify.com

**Gerar uma senha de app nova do Gmail** em
https://myaccount.google.com/apppasswords. A atual está no `email_config.php`
local em texto puro e vai virar variável de ambiente agora; é o momento certo
de trocar. Revogue a antiga depois que a nova estiver funcionando.

---

## Parte 1 — Railway (banco e API)

### 1.1 Criar o projeto

1. **New Project** → **Deploy from GitHub repo** → `Ryan-Augusto08/NutriBalance`
2. O primeiro build vai falhar. É esperado: o `Dockerfile` não está na raiz do
   repositório. Corrija no passo seguinte.
3. No serviço criado: **Settings** → **Source** → **Root Directory** =
   `projetos/NutriBalance`
4. **Deploy** de novo. Agora o Railway acha o `Dockerfile` e a build passa.

### 1.2 Criar o banco

1. No mesmo projeto: **New** → **Database** → **Add MySQL**
2. O Railway provisiona e já cria as variáveis `MYSQLHOST`, `MYSQLUSER`,
   `MYSQLPASSWORD`, `MYSQLDATABASE` e `MYSQLPORT` dentro do serviço do banco.

### 1.3 Importar as tabelas e a TACO

O jeito mais direto é pelo HeidiSQL, que você já usa.

1. No serviço MySQL do Railway: aba **Variables** → copie os valores de
   `MYSQL_PUBLIC_URL` (ou o par `RAILWAY_TCP_PROXY_DOMAIN` +
   `RAILWAY_TCP_PROXY_PORT`, mais a senha)
2. No HeidiSQL, crie uma sessão nova com esses dados e conecte
3. **File** → **Run SQL file** → `banco/nutribalance_completo.sql`
4. Confira: a tabela `alimentos` deve ficar com centenas de linhas da TACO, e
   `usuarios`, `medicoes` e `redefinicoes_senha` devem existir, vazias

> O endereço público do banco existe para isso — administração externa. A API
> não usa ele: dentro do Railway os dois serviços se falam pela rede interna,
> que não passa pela internet.

### 1.4 Ligar a API ao banco

No serviço **PHP** (não no do MySQL), aba **Variables**, adicione:

| Variável  | Valor                        |
|-----------|------------------------------|
| `DB_HOST` | `${{MySQL.MYSQLHOST}}`       |
| `DB_PORT` | `${{MySQL.MYSQLPORT}}`       |
| `DB_NAME` | `${{MySQL.MYSQLDATABASE}}`   |
| `DB_USER` | `${{MySQL.MYSQLUSER}}`       |
| `DB_PASS` | `${{MySQL.MYSQLPASSWORD}}`   |

Essa sintaxe `${{Servico.VARIAVEL}}` é do próprio Railway: ela aponta para a
variável do outro serviço em vez de copiar o valor. Se a senha do banco mudar,
a API acompanha sozinha.

> Se o nome do serviço de banco não for exatamente `MySQL`, ajuste o prefixo.

### 1.5 Disco para as fotos de perfil

Sem esta etapa, toda foto de perfil some no próximo deploy: o disco do
container é descartado e recriado a cada build.

1. Serviço PHP → **Settings** → **Volumes** → **Add Volume**
2. Mount path: `/var/www/html/uploads`

### 1.6 Variáveis do e-mail

Ainda no serviço PHP, aba **Variables**:

| Variável        | Valor                                  |
|-----------------|----------------------------------------|
| `SMTP_HOST`     | `smtp.gmail.com`                       |
| `SMTP_PORTA`    | `587`                                  |
| `SMTP_USUARIO`  | o seu Gmail                            |
| `SMTP_SENHA`    | a senha de app **nova**                |
| `URL_SITE`      | preencher na Parte 3                   |

Sem elas a recuperação de senha não envia nada — mas o resto do site funciona
normalmente, e o motivo fica registrado no log. É o `email_configurado()` do
`api/email.php` cuidando disso.

### 1.7 Gerar o domínio

**Settings** → **Networking** → **Generate Domain**. Anote o endereço; ele tem
a forma `algo.up.railway.app`.

Teste antes de seguir, abrindo no navegador:

```
https://<dominio-railway>/api/buscar.php?q=arroz
```

Tem que voltar um JSON com alimentos. Se voltar, a API e o banco estão
conversando.

---

## Parte 2 — Netlify (front)

1. **Add new site** → **Import an existing project** → GitHub → o mesmo
   repositório
2. Não altere nada nas configurações de build: o `netlify.toml` na raiz já
   define o `publish` e o comando. Deixe o **base directory** em branco.
3. **Deploy site**
4. Em **Site configuration** → **Change site name**, troque o nome sorteado por
   `nutribalance` (fica `nutribalance.netlify.app`)

Nesse ponto o site abre, mas login e busca ainda falham — o proxy ainda aponta
para um domínio que não existe. É a Parte 3.

---

## Parte 3 — Ligar os dois

**3.1** No `netlify.toml` (raiz do repositório), troque as duas ocorrências de
`SUBSTITUA-PELO-DOMINIO.up.railway.app` pelo domínio real do Railway.

**3.2** Commit e push. O Netlify republica sozinho em cerca de um minuto.

**3.3** No Railway, defina `URL_SITE` = `https://nutribalance.netlify.app`
(sem barra no fim).

Essa variável merece atenção. Ela é a base do link que vai no e-mail de
redefinição de senha. Sem ela, o `url_site()` monta o endereço a partir da
requisição que chegou — e a requisição chega do proxy, com o domínio do
Railway. O link iria para o servidor errado.

---

## Conferir se ficou de pé

Pelo endereço do Netlify, na ordem:

- [ ] A página inicial abre com o visual certo
- [ ] Criar uma conta nova funciona
- [ ] O onboarding calcula as metas e salva
- [ ] Buscar "arroz" traz resultados da TACO
- [ ] Enviar uma foto de perfil funciona e ela aparece
- [ ] Sair e entrar de novo mantém os dados
- [ ] "Esqueci minha senha" envia o e-mail, e o link do e-mail abre o site
- [ ] Registrar peso na aba Progresso desenha o gráfico

O teste da foto é o que confirma o volume do passo 1.5, e o do e-mail é o que
confirma a `URL_SITE`. São os dois mais fáceis de deixar passar.

---

## Depois de publicado

**Atualizar o site:** `git push`. Netlify e Railway assistem o mesmo
repositório e republicam sozinhos. Mudança em `site/css/`, `site/js/` ou HTML
sobe pelo Netlify; mudança em `site/api/` sobe pelo Railway.

**O localhost continua igual.** O `conexao.php` só usa variável de ambiente
quando ela existe; no XAMPP não existe nenhuma, e ele cai nos valores de
sempre. Desenvolver segue sendo em `http://localhost/nutribalance`.

**O `email_config.php` nunca vai para o servidor.** Ele está no `.gitignore` e
no `.dockerignore`. Em produção quem responde por aqueles valores são as
variáveis de ambiente.

---

## Quando algo não funcionar

| Sintoma | Causa provável |
|---|---|
| Build do Railway não acha o Dockerfile | Root Directory não está em `projetos/NutriBalance` (passo 1.1) |
| `AH00534: More than one MPM loaded`, container reiniciando em loop | O ambiente do Railway habilita um MPM a mais por cima do que a imagem traz. O `a2dismod mpm_event mpm_worker` do Dockerfile existe para isso — se voltar, confirme que essa linha continua lá |
| `could not find driver` no log | A linha `docker-php-ext-install pdo_mysql` não rodou — build antiga em cache |
| API responde 502 e o log não mostra erro | Apache subiu na porta errada. Confirme que o `docker/iniciar.sh` está com fim de linha LF |
| Login entra e cai logo em seguida | Sessão sem persistência. Confira se o proxy do `netlify.toml` está com `status = 200`, e não `301` |
| Foto some depois de um deploy | Falta o volume do passo 1.5 |
| E-mail não chega | `SMTP_SENHA` com a senha normal da conta em vez da senha de app |
| Link do e-mail leva para o domínio errado | `URL_SITE` não definida no Railway (passo 3.3) |
| Busca de alimento volta vazia | O `nutribalance_completo.sql` não foi importado (passo 1.3) |

Log do backend: Railway → serviço PHP → aba **Deployments** → **View Logs**.
O `docker/php.ini` manda os erros do PHP para lá.
