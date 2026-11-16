# PREMULTISF Avalia

Painel gerencial (Next.js 14 + Tailwind + Recharts) que lê a planilha de respostas do Google Forms a cada 60 s. Novas respostas entram sem rebuild.

## Variáveis de ambiente (Vercel → Settings → Environment Variables)
- `SHEET_ID`   ID da planilha (padrão: a informada no projeto)
- `SHEET_TAB`  nome da aba (padrão: `Respostas ao formulário 1`)
- `ADMIN_TOKEN` senha da área restrita (comentários, categoria, Centro de Saúde, respostas individuais)

## Publicar
1. Suba esta pasta para um repositório no GitHub.
2. vercel.com → Add New → Project → importe o repositório (framework: Next.js, detectado sozinho).
3. Cadastre as variáveis acima e clique em Deploy.
4. Na planilha: Compartilhar → "Qualquer pessoa com o link" → Leitor.

## Privacidade (recomendado)
A aba original tem e-mail, nome e data. O app não lê essas colunas, mas quem tiver o ID da planilha pode vê-las.
Crie uma aba/planilha derivada sem elas e aponte `SHEET_ID`/`SHEET_TAB` para ela, por exemplo (separadores pt-BR):
`={IMPORTRANGE("URL_DA_PLANILHA";"Respostas ao formulário 1!A1:A")\IMPORTRANGE("URL_DA_PLANILHA";"Respostas ao formulário 1!E1:ZZ")}`
(mantém o carimbo da coluna A e tudo a partir da coluna E; descarta e-mail, data e nome). Compartilhe só a derivada.

## Regras de cálculo (lib/model.ts e lib/sheet.ts)
Concordo totalmente=5 … Discordo totalmente=1; "Não se aplica" fora da conta. Faixas: <3 crítico, 3–4 atenção, ≥4 bom.
Papéis com menos de 3 respostas ficam ocultos na visão pública (`MIN_N`). As colunas são lidas pelo cabeçalho
"Dimensão (R|P|T|CCS|CR) [pergunta]", então novas perguntas/perfis entram automaticamente.
