# Empresa

> Memória central do negócio. O Claude lê esse arquivo antes de cada resposta.
> Preenchido pelo `/instalar` — você pode editar a qualquer momento.

**Nome:** Ryan — projeto NutriBalance
**Negócio:** TCC (Trabalho de Conclusão de Curso) do Ensino Médio integrado ao curso de Desenvolvimento de Sistemas
**O que faz:** NutriBalance facilita a vida de quem quer ter hábitos saudáveis — site de acompanhamento nutricional parecido com o MyFitnessPal, sem a funcionalidade de leitura/registro por código de barras
**Perfil:** Solopreneur / criador solo (projeto tocado por Ryan na prática)
**Atende clientes:** Pessoas interessadas em cuidar da saúde e melhorar fisicamente — seja ganhando, perdendo ou mantendo peso
**Equipe:** Sozinho na prática. Há mais dois amigos oficialmente no projeto, mas não se manifestaram até agora, então Ryan seguiu sozinho
**Ferramentas:** XAMPP (Apache + MySQL + PHP 8.2, instalado em D:\Xampp), HeidiSQL, VS Code, GitHub (Ryan-Augusto08/NutriBalance)
**Principais entregas:** Site NutriBalance — dashboard com meta diária de kcal, resumo de macros (proteína, carboidrato, gordura) e lista de refeições do dia; cadastro/login com recuperação de senha por e-mail; onboarding com cálculo de metas (TDEE, IMC, previsão de prazo); busca de alimentos na TACO; seção Progresso (histórico de peso/cintura + gráfico em SVG). Fora do site: documentação técnica do TCC em `marketing/NutriBalance-Documentacao-Tecnica.html` (com PDF)

## Contexto adicional

- Projeto acadêmico (TCC), não uma empresa comercial — isso pesa na seriedade exigida do tom de escrita.

## Pilha técnica

- **Arquitetura:** API JSON em PHP + front-end em HTML/CSS/JS puro (módulos ES), sem framework e sem etapa de build. O PHP nunca imprime HTML; quem monta a tela é o JavaScript.
- **Banco:** MySQL, 4 tabelas (`alimentos`, `usuarios`, `medicoes`, `redefinicoes_senha`). Acesso por PDO com prepared statements.
- **Única biblioteca externa:** PHPMailer, em `site/api/lib/PHPMailer/`, instalado à mão (sem Composer), para o e-mail de recuperação de senha.
- **Envio de e-mail:** SMTP do Gmail com senha de app. Credenciais em `site/api/email_config.php`, que está no `.gitignore` — nunca versionar nem copiar para pendrive.
- **Ambiente local:** `D:\Xampp\htdocs\nutribalance` é um symlink para `MazyOS/site`, então o site roda em `http://localhost/nutribalance`.
