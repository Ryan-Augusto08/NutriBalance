# Seminovos — sistema de gestão para loja de carros usados

> Projeto criado em 23/08/2026. Pasta dedicada — instruções aqui sobrescrevem
> as da raiz quando houver conflito.
>
> **Nome provisório.** Vira o nome da loja (ou do produto) quando houver uma.

## Sobre

Sistema de gestão para loja de seminovos: estoque de veículos, funil de
interessados, fechamento de venda, faturamento e margem por carro.

## Tipo

Iniciativa pessoal, **em fase de validação**. Não existe loja cliente ainda.

## Estágio atual — validação, não construção

Nada de código de produção é escrito nessa fase. O que existe aqui serve pra
uma coisa só: **mostrar pra donos de loja de seminovos e descobrir se o
problema é real** antes de investir semanas em desenvolvimento.

O que está pronto pra isso:

- `modelagem/modelo-de-dados.md` — o desenho do sistema (tabelas, relações,
  as consultas que geram cada número do painel)
- `prototipo/painel.html` — protótipo navegável com dados fictícios, pra abrir
  no celular dentro da loja
- `validacao/roteiro-entrevista.md` — o que perguntar, e o que **não** perguntar

Só passar pra construção depois que o roteiro tiver rodado com pelo menos
três lojas. O resultado de cada conversa vai em `validacao/`.

## Decisões já tomadas

- **Pilha:** PHP + MySQL com Laravel. Decidida em 23/08/2026, **ainda não
  instalada** — o Laravel só entra quando a construção começar. O protótipo de
  validação é HTML puro de propósito, pra não amarrar nada.
- **Hospedagem:** local primeiro (XAMPP na máquina da loja, acesso pela rede),
  online depois. Como a migração é certa, escrever desde o início sem caminho
  absoluto e com configuração de ambiente separada do código — foi caminho
  fixo que quebrou o NutraBalance em 06/08/2026.

## Dado pessoal — a regra muda quando entrar loja real

Hoje essa pasta **é versionada no repositório da raiz, que é público**, e isso
só é seguro porque tudo aqui é fictício. Um sistema de seminovos em uso guarda
**CPF, telefone, placa e chassi** — dado pessoal de terceiro, sob a LGPD.

No dia em que qualquer dado de loja ou de cliente real entrar aqui: repositório
próprio e privado pra pasta, e entrada no `.gitignore` da raiz, como já é
feito com o Rafael Gimenez e o Escritório Contábil. Histórico de git não
esquece — depois de commitado, é tarde.

## Específico desse projeto

- Loja de seminovos **compra e vende o mesmo tipo de item**: uma venda pode
  entrar um carro na troca, criando um veículo novo no estoque. Qualquer
  modelagem que trate venda como saída pura está errada.
- O número que interessa ao dono não é faturamento, é **margem por carro** —
  venda menos compra menos preparação. Sem registrar custo de preparação, o
  sistema mente.
