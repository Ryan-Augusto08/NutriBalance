# Delivery — marketplace de comida com entregadores

> Projeto criado em 20/11/2026. Pasta dedicada — instruções aqui sobrescrevem
> as da raiz quando houver conflito.
>
> **Nome provisório.** Vira o nome do produto quando houver um (como o
> GiantArena, que nasceu "Apostas Fortnite").

## Sobre

Marketplace de delivery de comida no modelo do iFood: o cliente pede de vários
restaurantes num app só, o restaurante recebe e prepara, e um entregador da
plataforma leva. As ideias e mecânicas são de referência; **nome, marca,
visual e código do iFood não entram**.

## Tipo

**Produto próprio do Ryan**, sem cliente e sem restaurante parceiro ainda.

## Formato — decidido em 20/11/2026

**Marketplace + entregadores**, os três lados:

| Lado | Quem é | O que usa |
|---|---|---|
| Cliente | quem pede comida | vitrine de restaurantes, carrinho, pagamento, acompanhamento do pedido |
| Restaurante | quem vende | painel de pedidos, cardápio, horário, repasses |
| Entregador | quem leva | app/página de corridas, aceite, rota, ganhos |

Mais a **administração** da plataforma (cadastro e aprovação de restaurantes e
entregadores, taxas, suporte).

Foi escolhido sabendo que é o formato maior dos três que estavam na mesa (os
outros eram "pedido direto pra um restaurante" e "marketplace sem entregador").
O risco central é o **ovo e a galinha**: cliente só vem se tiver restaurante,
restaurante só entra se tiver cliente, e entregador só fica se tiver corrida.
Por isso o plano em `_memoria/estrategia.md` é por fases, começando numa
cidade só.

## Entregas previstas

- `sistema/` — o código (os três lados + administração)
- `validacao/` — conversa com restaurante e entregador, concorrência
- `proposta/` — material pra convencer restaurante a entrar
- `conteudo/` — divulgação pra restaurante, entregador e cliente

## Regras desse projeto

1. **Nada do iFood dentro do produto.** Nem nome, logo, cor, ícone, texto de
   tela copiado nem foto de cardápio tirada de lá. Estudar o app por fora (as
   telas, os fluxos, o que ele cobra) é permitido; descompilar o app, usar API
   interna ou raspar dados de restaurante dele não é.
2. **Dinheiro passa por gateway com split.** A plataforma não segura dinheiro
   de restaurante nem de entregador na própria conta: o pagamento é dividido
   na hora pelo gateway (Mercado Pago, Pagar.me, Asaas ou outro, a escolher).
   Segurar e repassar dinheiro de terceiro é atividade regulada.
3. **Entregador é tema jurídico em aberto.** A relação de trabalho de
   entregador de aplicativo está em discussão no Brasil (STF e projeto de lei).
   Não escrever termo de uso, contrato ou promessa a entregador como se a
   regra estivesse resolvida. Antes de entregador real rodar, ouvir um
   advogado.
4. **Dado pessoal sai do repositório público antes de entrar.** O repositório
   da raiz do MazyOS é público. Endereço de cliente, telefone, documento e
   localização de entregador, dados bancários de restaurante: no dia em que o
   primeiro dado real (ou a primeira conversa com restaurante de verdade)
   chegar, a pasta vai pro `.gitignore` da raiz e ganha repositório próprio
   **privado**, como Seminovos e GiantArena.
5. **Rodar `/seguranca` antes de qualquer deploy.** Sistema com login,
   pagamento e localização é o caso que a skill existe pra cobrir.

## Contexto do projeto

- `briefing.md` — o que foi decidido na criação e o que falta responder
- `_memoria/empresa.md` — o produto, o mercado, quem paga
- `_memoria/preferencias.md` — tom dos documentos e de como falar com cada lado
- `_memoria/estrategia.md` — fases, foco atual, próximos passos
