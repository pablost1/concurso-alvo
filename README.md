# Concurso Alvo

Sistema web: cadastro de usuário, busca periódica de concursos abertos em **todo o Brasil** (PCI Concursos, com confirmação no site oficial da banca/órgão), filtro por **área** (Tecnologia/Programação, Saúde, Educação…), escolha do cargo-alvo, banco de **provas anteriores de TI** e prova montada pelas **competências do edital**, com **XP/proficiência** estilo Duolingo. **Nenhuma IA é usada**: tudo é leitura determinística (regex) e dicionário de termos.

## Rodando

```bash
npm install --legacy-peer-deps
cp .env.example .env        # preencha SESSION_SECRET e CRON_SECRET
npx prisma migrate deploy
npm run dev                 # http://localhost:3000
```

1. Crie uma conta em `/cadastro`.
2. Em `/concursos`, **Buscar concursos agora** (também roda a cada 6 h; `DISABLE_CRON=1` desliga). Filtre por **Área**, UF e escolaridade e **adicione o cargo como alvo**.
3. Em `/meus-alvos`: **Ler edital e extrair temas** (link oficial, PDF enviado ou tópicos digitados). O parser lê o padrão `CARGO N: … DISCIPLINA: 1 item. 2 item…` (editais do Cebraspe); fora desse padrão, digite os tópicos.
4. **Estudar** (`/estudar`): pratica por competência. **Simulado** (`/simulado`): três modos — *Prova do cargo (por competências)*, *Só deste concurso* e *Cruzado*.

## Banco de provas de TI (`/provas`)

```bash
npm run provas:backfill                  # lê TODO o Cebraspe: provas, gabaritos e editais de TI (retomável, ~1 req/s)
npm run provas:backfill -- --reenfileirar # idem, tentando de novo as provas com erro
npm run taxonomia:sugerir                # termos de edital/questões que a taxonomia ainda não reconhece
```

- **Fonte**: API aberta do Cebraspe (concursos encerrados → prova objetiva + gabarito em PDF + edital de abertura). Antes de cada domínio o sistema lê o `robots.txt` e respeita (`src/lib/http.ts`). O PCI Concursos não é usado para provas (exige login + captcha e proíbe PDFs); FCC, Vunesp e IBFC bloqueiam robôs — use **Importar prova (PDF)** em `/provas`.
- **Leitura**: três layouts do Cebraspe (múltipla escolha `Questão N` + A–E; certo/errado com tabulação; certo/errado numerado com espaço). O gabarito oficial é lido da tabela; anuladas (`X`) ficam fora. Provas cuja contagem não fecha viram `erro` com o motivo (nunca grava prova truncada). Questões que dependem de figura/texto-base são marcadas e não entram em simulados.
- **Competências**: `src/lib/taxonomia/ti.ts` (Banco de Dados, Redes, Segurança, Eng. de Software, Programação, SO, Governança, Nuvem/DevOps, Infra, Dados/IA + gerais). Cada questão e cada item de edital é classificado por dicionário de termos. Veja a cobertura em `/taxonomia`.
- **Perfil do cargo**: itens do edital → competências com peso. Sem edital parseável, usa a média de editais passados do mesmo cargo; sem isso, um perfil genérico de TI. A prova do cargo distribui as questões por esses pesos (maior resto), sem repetir enunciado, priorizando mesmo órgão/banca e provas recentes, e informa o que faltou.

## XP

- Acerto: 10 × dificuldade; erro: 2; +5 a cada 5 acertos seguidos; repetir a mesma questão no mesmo dia: 0.
- Domínio de cada competência: média ponderada das últimas 5 respostas únicas (mínimo de 3 questões distintas).
- Proficiência do cargo: média do domínio das competências ponderada pelo peso no edital. XP do perfil = soma dos XPs de todos os cargos.

## Limites conhecidos

- Coleta automática só do Cebraspe; as demais bancas dependem de importação manual (mesmo parser, desde que o layout seja um dos três acima).
- PDFs escaneados (só imagem) não são lidos — não há OCR.
- A classificação por dicionário não cobre 100% das questões; as não classificadas ficam em `/taxonomia` e só entram em simulados depois de ganharem competência.
- Questões de provas reais podem ter erros de extração; confira o enunciado quando algo parecer estranho.

## Testes

`npm test` (vitest): parsers de prova/gabarito/edital com PDFs reais como fixtures, taxonomia, montagem da prova e XP.

## Importar de provas-ads

O projeto vizinho `provas-ads` extrai questões de PDFs baixados à mão e gera `out/questoes.jsonl`. Não é preciso API nem servidor: basta o arquivo.

    npm run provas:importar-ads                       # usa ../provas-ads/out/questoes.jsonl
    npm run provas:importar-ads -- caminho/outro.jsonl

Só entram questões com gabarito; duplicadas (mesmo enunciado já no banco) e figuras são tratadas como no restante do banco. Pode rodar de novo sem duplicar.

## Provas passadas do PCI Concursos (só links)

Em **Meus alvos**, cada cargo tem "Provas passadas para este cargo": links do PCI separados em *este concurso* (mesmo órgão) e *outros concursos*. O sistema apenas lista as páginas de provas (permitidas pelo `robots.txt`, com cache de 7 dias); você abre o link, resolve o captcha, baixa prova e gabarito e envia em `/provas` (ou usa o `provas-ads` + `npm run provas:importar-ads`).
