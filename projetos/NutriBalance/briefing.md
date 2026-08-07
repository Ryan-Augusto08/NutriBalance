# Briefing — NutriBalance

> Consolidado em 06/08/2026, a partir do que já existia no workspace.
> Documento de referência do projeto: o que é, em que pé está, o que falta.

## Identificação

| | |
|---|---|
| **Projeto** | NutriBalance |
| **Tipo** | TCC — Ensino Médio integrado ao curso de Desenvolvimento de Sistemas |
| **Responsável** | Ryan (3º ano) |
| **Equipe** | Sozinho na prática. Dois colegas constam oficialmente, mas não participaram até agora |
| **Repositório** | github.com/Ryan-Augusto08/NutriBalance |
| **Início do versionamento** | 20/07/2026 (primeiro commit do site) |

## Objetivo

Facilitar a vida de quem quer ter hábitos saudáveis, entregando o essencial de
um app de acompanhamento nutricional: registro de refeições, cálculo de metas
diárias e acompanhamento da evolução física ao longo do tempo.

## Escopo

Referência declarada: MyFitnessPal, **sem** a funcionalidade de leitura e
registro de alimento por código de barras — recorte assumido desde o início.

## Público

Pessoas interessadas em cuidar da saúde e melhorar fisicamente, seja ganhando,
perdendo ou mantendo peso. No curto prazo, também a banca avaliadora do TCC.

---

## Arquitetura

API JSON em PHP com front-end em HTML, CSS e JavaScript puro (módulos ES).
Sem framework e sem etapa de build. O PHP **nunca imprime HTML** — quem monta
a tela é o JavaScript, consumindo os endpoints por `fetch`.

| Camada | Tecnologia |
|---|---|
| Front-end | HTML, CSS e JS puro em módulos ES |
| Back-end | PHP 8.2, API JSON |
| Banco | MySQL (MariaDB 10.4), acesso por PDO com prepared statements |
| Servidor local | XAMPP (Apache + MySQL), instalado em `D:\Xampp` |
| Bibliotecas externas | Apenas PHPMailer, instalado à mão, sem Composer |

**Banco — 4 tabelas:** `alimentos` (a TACO 4ª edição, 597 registros),
`usuarios` (conta e personalização), `medicoes` (histórico de peso e cintura)
e `redefinicoes_senha` (tokens de recuperação).

**Front — organização:** `js/principal.js` é o único script que o dashboard
carrega; todo o resto entra por `import`. Estado compartilhado em `estado.js`,
persistência em `dados.js`, desenho da tela em `tela.js`, e um módulo por área
de interação (`refeicoes`, `alimentos`, `perfil`, `progresso`, `auth`).

## Funcionalidades entregues

- Dashboard com meta diária de kcal, barras de progresso por macro (carboidrato, proteína, gordura) e lista de refeições do dia
- Cadastro, login e logout, com recuperação de senha por e-mail (SMTP do Gmail)
- Onboarding com cálculo de metas: TDEE, IMC e previsão de prazo para atingir o peso desejado
- Busca de alimentos na TACO, acento-insensível e casando por palavras (`arroz cozido` encontra `Arroz, integral, cozido`)
- Seção Progresso: histórico de peso e cintura com gráfico de evolução em SVG e filtros de período
- Foto de perfil enviada pelo usuário
- Documentação técnica do TCC em `marketing/`, em HTML e PDF

## O que falta

- Persistência das refeições em banco. Conta, perfil, metas e medições já estão no MySQL; **só as refeições do dia seguem no `localStorage`**
- Foto real do banner (`site/img/banner.jpg`) — hoje é um gradiente placeholder
- Padronizar a logo nas telas de acesso: `cadastro.html` usa a variante símbolo, as demais usam a completa
- Simular a banca com perguntas difíceis
- Completar o que resta do escopo do MyFitnessPal

---

## Risco identificado

Registrado em 03/08/2026. Ryan levantou o receio de que a arquitetura escolhida
(API JSON + `fetch`) destoe do que os professores ensinam em aula (PHP
misturado com HTML) e que isso pese negativamente na avaliação.

**Tratamento até agora:** a documentação técnica ganhou a seção 1.5 tratando
especificamente dessa escolha, e o código recebeu comentários didáticos nos
pontos de conceito novo.

**Pendente:** simular a arguição da banca com perguntas difíceis sobre a
decisão de arquitetura.

## Prazo

Data de entrega do TCC ainda não informada.

## Histórico da pasta

O projeto nasceu espalhado pela raiz do MazyOS. Em 06/08/2026 foi consolidado
em `projetos/NutriBalance/` como projeto autocontido — levando junto a própria
memória e identidade visual — para que o MazyOS possa hospedar outros projetos.
