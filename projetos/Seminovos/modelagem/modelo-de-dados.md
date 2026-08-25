# Modelo de dados — Seminovos

> Desenho do sistema. Ainda não é SQL de produção: serve pra pensar o problema
> e pra sustentar o protótipo. Vira migration quando a construção começar.

## As entidades e como se ligam

```
                     ┌─────────────┐
                     │   USUARIOS  │  dono e vendedores
                     └──────┬──────┘
                            │ registra
                            ▼
┌──────────┐   1:N   ┌─────────────┐   N:1   ┌──────────┐
│ VEICULOS │◄────────│   VENDAS    │────────►│ CLIENTES │
└────┬─────┘         └─────────────┘         └────┬─────┘
     │                      │                     │
     │ 1:N                  │ carro na troca      │
     ├──► VEICULO_FOTOS     └──► VEICULOS ────────┤
     │                          (entrada nova)    │
     │ 1:N                                        │
     ├──► VEICULO_CUSTOS   (preparação)           │
     │                                            │
     │                ┌─────────────┐             │
     └───────────────►│ INTERESSES  │◄────────────┘
                      └──────┬──────┘   cliente x carro
                             │ 1:N
                             ▼
                      ┌─────────────┐
                      │ INTERACOES  │  histórico do follow-up
                      └─────────────┘
```

## Tabelas

### `veiculos` — o estoque

| Campo | Tipo | Nota |
|---|---|---|
| `id` | PK | |
| `marca`, `modelo`, `versao` | varchar | "Fiat", "Argo", "1.3 Drive" |
| `ano_fabricacao`, `ano_modelo` | int | são dois, e diferentes |
| `cor`, `combustivel`, `cambio`, `portas` | varchar/int | |
| `placa` | varchar(8) | **dado pessoal** — identifica o antigo dono |
| `chassi` | varchar(17) | idem |
| `km` | int | |
| `preco_compra` | decimal | quanto a loja pagou |
| `preco_anuncio` | decimal | quanto está pedindo |
| `data_entrada` | date | base do "dias em pátio" |
| `status` | enum | `disponivel`, `reservado`, `vendido`, `devolvido` |
| `origem` | enum | `compra_direta`, `troca`, `consignado` |
| `observacoes` | text | |

**Consignado importa:** carro consignado é de terceiro, não é patrimônio da
loja. Se entrar no mesmo bolo do estoque próprio, todo cálculo de capital
parado sai errado.

### `veiculo_fotos`

`id`, `veiculo_id` (FK), `arquivo`, `ordem`, `capa` (bool).

Foto de carro pesa. Redimensionar no upload (largura máxima ~1600px) e guardar
uma miniatura — uma loja de 40 carros com 8 fotos cada já são 320 arquivos, e
a listagem carrega todas as capas de uma vez.

### `veiculo_custos` — o que faz a margem ser verdadeira

`id`, `veiculo_id` (FK), `tipo` (`funilaria`, `mecanica`, `documentacao`,
`estetica`, `outro`), `descricao`, `valor`, `data`.

Sem essa tabela o sistema mostra lucro que não existe. Um carro comprado por
40k e vendido por 48k parece 8k de lucro; com 2.500 de funilaria e 900 de
documentação, são 4.600.

### `clientes` — os leads

`id`, `nome`, `telefone`, `email`, `cpf` (só no fechamento), `origem`
(`portal`, `indicacao`, `balcao`, `instagram`, `passagem`), `data_cadastro`,
`observacoes`.

**CPF só quando a venda fecha.** Pedir no primeiro contato afasta o cliente e
cria obrigação de LGPD sem contrapartida.

### `interesses` — quem quer qual carro

| Campo | Nota |
|---|---|
| `id` | |
| `cliente_id`, `veiculo_id` | FKs — a ligação que responde a pergunta |
| `etapa` | `novo`, `contato`, `visita`, `proposta`, `negociacao`, `fechado`, `perdido` |
| `motivo_perda` | `preco`, `credito_negado`, `comprou_em_outra`, `sumiu`, `outro` |
| `criado_em`, `atualizado_em` | `atualizado_em` alimenta o alerta de lead parado |

Um cliente pode ter interesse em vários carros, e um carro atrai vários
clientes — daí a tabela própria em vez de um campo. Quando um carro vende, os
outros interesses nele não somem: viram lista de quem procura carro parecido.

### `interacoes` — o follow-up

`id`, `interesse_id` (FK), `tipo` (`ligacao`, `whatsapp`, `visita`,
`proposta_enviada`), `anotacao`, `usuario_id`, `data`.

É o que impede o "eu já liguei pra esse?" e o que sustenta o alerta de lead
sem retorno há X dias.

### `vendas`

| Campo | Nota |
|---|---|
| `id` | |
| `veiculo_id`, `cliente_id`, `usuario_id` | carro, comprador, vendedor |
| `valor_venda` | fechado, não o anunciado |
| `forma_pagamento` | `a_vista`, `financiado`, `misto` |
| `valor_entrada`, `banco`, `parcelas` | quando financiado |
| `veiculo_troca_id` | **FK pra `veiculos`, anulável** |
| `valor_avaliacao_troca` | quanto foi dado pelo carro do cliente |
| `data_venda` | |

O `veiculo_troca_id` é o detalhe que separa uma modelagem de loja de carros de
um e-commerce qualquer: **a venda pode gerar uma entrada no estoque**. O carro
recebido na troca nasce em `veiculos` com `origem = 'troca'` e
`preco_compra = valor_avaliacao_troca`.

### `usuarios`

`id`, `nome`, `email`, `senha_hash`, `papel` (`admin`, `vendedor`), `ativo`.

Vendedor vê o próprio funil e o estoque; margem e faturamento são do admin.

## De onde vem cada número do painel

| O que a loja quer ver | Como sai |
|---|---|
| Carros no pátio | `count(veiculos where status='disponivel')` |
| Capital parado | `sum(preco_compra + custos) where status='disponivel'` e `origem != 'consignado'` |
| Vendas do mês | `count(vendas where data_venda no mês)` |
| Faturamento do mês | `sum(valor_venda)` no mês |
| **Margem do mês** | `sum(valor_venda - preco_compra - custos)` |
| Ticket médio | faturamento ÷ vendas |
| Giro (dias em pátio) | `avg(data_venda - data_entrada)` dos vendidos |
| Encalhados | `veiculos disponíveis com data_entrada > 90 dias` |
| Quem quer qual carro | `interesses` agrupado por `veiculo_id`, etapa ativa |
| Leads esfriando | `interesses` em etapa ativa com `atualizado_em > 7 dias` |
| Por que se perde venda | `interesses` agrupado por `motivo_perda` |

As duas últimas linhas costumam ser o que o dono nunca viu antes — e é onde o
sistema deixa de ser "planilha bonita" e começa a valer dinheiro.
