# Briefing — Seminovos

**Data:** 23/08/2026
**Status:** ideia em validação, sem cliente

## O pedido original

Sistema para loja de venda de carros seminovos, com controle de estoque,
faturamento, quantos carros foram vendidos e quem está interessado em qual
carro.

## Decisões da conversa de abertura (23/08/2026)

| Pergunta | Resposta |
|---|---|
| Loja real ou projeto próprio? | **Ideia pra validar antes** — não há loja cliente |
| Pilha | **PHP + MySQL com framework (Laravel)** |
| Onde roda | **Local agora, online depois** |

## O que ainda não se sabe (perguntar às lojas)

Está tudo em `validacao/roteiro-entrevista.md`. Os pontos que mais mudam o
escopo:

1. **Como a loja controla estoque hoje?** Se a resposta for "planilha e está
   ótimo", o problema não é esse e o sistema não vende.
2. **Quantos carros no pátio e quantas vendas por mês?** Uma loja de 15 carros
   e uma de 150 são produtos diferentes.
3. **Quem usaria?** Só o dono, ou vendedores também? Isso decide se precisa de
   perfil de acesso já na primeira versão.
4. **Já existe sistema?** Existem players consolidados no nicho (Autoconf,
   Boom Sistemas, Revenda Mais). Saber o que a loja usa e por que reclama vale
   mais que qualquer funcionalidade nova.
5. **Anúncio nos portais.** Loja de seminovos vive de OLX / Webmotors / Mercado
   Livre. Se o sistema não ajuda a publicar lá, pode ser irrelevante por mais
   completo que seja o resto.
6. **Quanto pagaria por mês?** Pergunta desconfortável, mas é a única resposta
   que separa "achei legal" de "eu compro".

## Fora de escopo por enquanto

- Emissão de nota fiscal e integração fiscal (regra pesada, muda por estado)
- Financiamento/simulação de crédito com banco
- Site público de vitrine — outro projeto, se for o caso
