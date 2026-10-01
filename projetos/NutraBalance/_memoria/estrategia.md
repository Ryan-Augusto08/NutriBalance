# Estratégia

> O que importa agora. Prioridades, metas, prazos.
> O Claude usa isso pra decidir o que sugerir primeiro e o que adiar.
> Atualize sempre que as prioridades mudarem.

## Fase

Desenvolvimento avançado. O sistema já está funcional ponta a ponta:
dashboard, cadastro/login, onboarding com cálculo de metas, busca na TACO,
seção Progresso (peso/cintura + gráfico), recuperação de senha por e-mail e
travas de zoom e seleção de texto (06/08/2026).
Foco migrando de "construir" para "conseguir defender na banca".

Em 22/08/2026 o projeto foi **renomeado de NutriBalance para NutraBalance** —
pasta, banco MySQL, junction do XAMPP, chave do localStorage, logo e o PDF da
documentação. Os nomes externos (GitHub, Netlify, Railway) continuam antigos.
No mesmo dia a aba Progresso foi reformulada: passou a ter um seletor de
métrica (peso ou cintura) e cinco períodos, o gráfico ganhou grade e escala em
números redondos, e o resumo em texto saiu.

## Ajustes pedidos pela banca (feitos em 30/09/2026)

Anotações da apresentação e o que foi feito com cada uma:

- **"Leia mais"**: cards de refeição recolhíveis (seta abre os alimentos).
- **Card de kcal atualizar sozinho**: ao registrar peso, a meta nova já
  aparece no card, no Resumo do Dia e na previsão, sem recarregar a página
  (`aplicarMetasNovas()` em `progresso.js`).
- **Rosane, manter registros**: conta de demonstração com 14 meses de
  medições, criada por `banco/criar_conta_demo.php`. Login
  `demo@nutrabalance.com` / `demo123`. Rodar o script antes da amostra técnica
  (e no Railway, se a demo for online).
- **Enzo (Laravel) e Caio ("supra basic", lido como Supabase)**: só na
  documentação, capítulo 10. Confirmar com o Caio se era mesmo Supabase.

## Planejado: levar contas e dados entre máquinas (30/09/2026)

**O problema.** No notebook, o banco foi montado do zero a partir do
`nutrabalance_completo.sql`, que só tem a estrutura e os 597 alimentos. A
conta do Ryan não veio junto. Existem três lugares com dados, e nenhum
viaja com a pasta:

| Dado | Onde mora | Viaja com a pasta ou com o GitHub? |
|---|---|---|
| Conta, perfil, metas (`usuarios`) | MySQL de cada máquina (`xampp\mysql\data`) | Não |
| Medições de peso/cintura (`medicoes`) | MySQL de cada máquina | Não |
| Refeições registradas | **localStorage do navegador**, chave `nutrabalance_data_<id>` | Não, e nem troca de navegador |
| Foto de perfil | `site/uploads/fotos/` (fora do git e da cópia portátil) | Não |

Detalhe que complica: o `id` do usuário muda de um banco para outro (no
notebook a conta demo ficou com id 1). Então copiar com os ids originais
pode colidir, e a chave do localStorage aponta para o id errado.

**Etapa 1: exportar e importar a conta (fazer primeiro, é pequena).**
> **Situação em 30/09/2026 ~12h:** os dois scripts foram ESCRITOS no
> notebook e a linha do `.gitignore` foi adicionada, mas **nada foi testado
> ainda**. Parou aqui porque o Ryan saiu para o almoço. Próximo passo:
> testar no notebook (exportar a conta demo, mudar algo, importar de volta,
> conferir cancelamento com "n" e a limpeza da foto inexistente). Depois,
> etapa 2. O formato virou JSON (`contas_exportadas.json`) em vez de `.sql`,
> porque facilita casar pelo e-mail e trocar o id.

Dois scripts em `banco/`, no mesmo estilo do `importar_remoto.php`:
- `exportar_contas.php`: gera `banco/contas_exportadas.json` com `usuarios` e
  `medicoes` de um ou mais e-mails (padrão: todos, menos a conta demo).
- `importar_contas.php`: lê esse arquivo e casa **pelo e-mail**, não pelo
  id. Se a conta já existir, atualiza. Se não existir, cria. Depois apaga e
  regrava as medições com o id local. Mostra na tela quantas contas e
  medições entraram.
- `contas_exportadas*.json` entra no `.gitignore` (feito): tem e-mail e hash de
  senha. Viaja no zip ou no pendrive com o mesmo cuidado do `email_config.php`.
- Uso: rodar a exportação na máquina principal, trazer o arquivo e importar
  no notebook (ou no caminho contrário).

**Etapa 2: refeições no banco (decidir antes de começar, é maior).**
Criar tabela `refeicoes` (ou `diario`) e API de salvar e listar, deixando o
localStorage só como cache. Resolve de uma vez: trocar de máquina, trocar
de navegador e usar no celular. Também é pergunta provável na banca ("se
limpar o navegador, perde tudo?"), e combina com o pedido da Rosane de
manter registros. Precisa de migração: na primeira entrada, subir o que
estiver no localStorage para o banco.

**Descartado:** apontar as duas máquinas para o banco do Railway. Exigiria
internet e deixaria a senha do banco de produção num PC que pode ser da
escola, o que o LEIA-ME-PORTATIL proíbe.

**Para conferir na máquina principal:** quais contas existem lá (a do Ryan
e outras de teste) e se o Railway tem contas reais que também precisem vir.

## Prioridade principal

Chegar à defesa do TCC seguro. Duas frentes:

1. **Defesa técnica** — Ryan levantou receio (03/08/2026) de que a
   arquitetura do projeto (API JSON + fetch) destoe do que os professores
   ensinam em aula (PHP misturado com HTML) e que isso pese na banca. A
   documentação técnica ganhou a seção 1.5 tratando exatamente disso, e o
   código recebeu comentários didáticos nos pontos de conceito novo.
   Pendente: simular a banca com perguntas difíceis.
2. **Funcionalidades restantes** — completar o que falta do escopo do
   MyFitnessPal (exceto leitura por código de barras).

## O que pode esperar

**Candidata a skill identificada em 06/08/2026:** sincronizar a pasta
`Desktop\NutriBalance-pendrive\` com o projeto. É sequência fixa, repetida
a cada mudança no site, e com duas exclusões que não podem falhar — a
credencial `email_config.php` e as fotos de usuário. Automatizar tira o
risco de esquecer justamente essas duas.

Rodar `/mapear-rotinas` quando quiser transformar em comando.

## Contexto com prazo

Prazo de entrega do TCC não informado ainda.
