# marketing/ — saídas do MazyOS

Tudo que as skills de marketing produzem cai aqui. Skills do MazyOS já sabem onde salvar — você raramente precisa criar pasta manualmente.

## Estrutura padrão

```
marketing/
├── conteudo/                    saídas do /carrossel e /publicar-tema
│   └── <tipo>-<tema>-<YYYY-MM-DD>/
│       ├── carrossel.html
│       ├── render.js
│       ├── instagram/slide-XX.png
│       ├── legenda.md
│       └── legenda-linkedin.md
│
├── seo/                         saídas do /seo (8 passos)
│   ├── 01-pesquisa-demanda.md
│   ├── 02-analise-concorrencia.md
│   ├── 03-google-meu-negocio.md
│   ├── 04-otimizacao-on-page.md
│   ├── 05-estrategia-conteudo.md
│   ├── 06-google-ads.md
│   ├── 07-checklist-monitoramento.md
│   └── 08-geo-otimizacao-ia.md
│
├── campanhas/                   saídas do /anuncio-google e /relatorio-ads
│   ├── google-ads-<YYYY-MM-DD>/  CSVs prontos pra importar
│   └── relatorios/               relatórios semanais
│
└── avaliacoes-google/           histórico do /responder-avaliacoes (opcional)
```

## Como funciona

- **`/carrossel` ou `/publicar-tema`** → cria pasta em `conteudo/<tipo>-<tema>-<data>/`
- **`/seo`** → preenche os 8 arquivos numerados em `seo/`
- **`/anuncio-google`** → cria pasta em `campanhas/google-ads-<data>/` com CSVs
- **`/relatorio-ads`** → cria arquivo em `campanhas/relatorios/<data>-relatorio.md`
- **`/responder-avaliacoes`** → opcionalmente salva histórico em `avaliacoes-google/`

## Versionamento

Tudo aqui versiona no git pelo `/salvar`. Útil pra comparar evolução de SEO entre meses, rever copies antigas, ou recuperar peça depois de mexer no Insta.

## Documentação técnica do TCC

`NutraBalance-Documentacao-Tecnica.html` é a fonte; o `.pdf` ao lado é gerado a
partir dele. **Editar sempre o HTML e regerar o PDF** — mexer no PDF direto não
tem volta e as duas versões saem de sincronia sem avisar.

O HTML já traz o CSS de impressão (`@page A4`, margens e controle de quebra de
página), então o PDF sai formatado sem ajuste manual. Não há Playwright nesta
máquina; quem renderiza é o Edge do Windows:

```powershell
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$dir  = "<caminho>\projetos\NutraBalance\marketing"
$lista = @(
  "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
  "--virtual-time-budget=30000", "--user-data-dir=$env:TEMP\edge-pdf",
  "--print-to-pdf=$dir\NutraBalance-Documentacao-Tecnica.pdf",
  "file:///$($dir -replace '\\','/')/NutraBalance-Documentacao-Tecnica.html"
)
Start-Process -FilePath $edge -ArgumentList $lista -NoNewWindow -Wait
```

Três detalhes que custaram tempo:

- **Usar `Start-Process`, não o operador `&`.** Chamado com `&`, o Edge devolve
  o controle na hora, o PowerShell segue adiante e o arquivo nunca é escrito —
  sem erro nenhum na tela. Com `-Wait` funciona.
- **`--no-pdf-header-footer`** tira o cabeçalho com URL e data que o Chromium
  carimba em toda página por padrão.
- O Edge escreve avisos inofensivos no stderr (`EDGE_IDENTITY`,
  `fallback_task_provider`). Não redirecionar com `2>$null`: o PowerShell 5.1
  transforma isso em erro terminante.

**Conferir o resultado.** O texto do PDF fica comprimido e em glyph id, então
`grep` no arquivo não acha nada — a ausência de resultado não prova erro. Para
ler de verdade, descomprimir os streams e desfazer o mapa de glifos (layout
padrão TrueType: `0x24 + índice` para maiúsculas, `0x44 + índice` para
minúsculas). Foi assim que se confirmou que a renomeação de 22/08/2026 tinha
entrado no PDF.
