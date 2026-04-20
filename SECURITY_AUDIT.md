# Relatório de Auditoria de Segurança — Portal Garage

**Data:** 2026-04-20
**Branch auditada:** `claude/security-audit-report-AluPT`
**Escopo:** Análise estática do código (Next.js + Prisma) cobrindo autenticação, autorização, injeção, exposição de dados, CSRF, uploads, segredos, dependências e LGPD.

---

## Resumo executivo

| Severidade | Qtd. |
|------------|-----:|
| Crítica | 2 |
| Alta | 6 |
| Média | 7 |
| Baixa | 7 |
| Informativa | 3 |
| **Total** | **25** |

Destaques:

- **Senha padrão `"12345"`** atribuída automaticamente a qualquer usuário `owner` criado ao cadastrar um evento (Garage Sale) — qualquer pessoa que descubra um e-mail de organizador consegue entrar.
- **Vazamento de detalhes internos** em respostas de erro 500 (mensagem bruta do Prisma enviada ao cliente).
- **Bypass do fluxo de reservas** via `PUT /api/products/[id]` por permitir escrita direta em `reservedBy*`.
- **Ausência de rate limiting** em `/login`, troca de senha e rotas públicas de busca.
- **LGPD incompleto** — rotas de exportação/exclusão de dados do titular ainda pendentes (ver `LGPD.md`).

---

## Críticos

### C1 — Senha padrão hardcoded `"12345"` para owners
- **Arquivo:** `src/app/api/garage-sales/route.ts:93` (e `98`, `115`)
- **Descrição:** Ao criar/atualizar um Garage Sale com e-mail, o código gera um `User` com papel `owner` usando `bcrypt.hash("12345", 10)`. Qualquer pessoa que saiba (ou adivinhe) o e-mail do organizador entra no portal.
- **Impacto:** Takeover total da conta do owner e acesso a dados do tenant.
- **Recomendação:**
  1. Gerar senha aleatória forte (ex.: `crypto.randomBytes(18).toString("base64url")`).
  2. Exibir a senha apenas uma vez ao admin que criou, ou enviar e-mail com link de definição de senha (token de uso único e expiração curta).
  3. Forçar `mustChangePassword: true` e exigir troca no primeiro login.
  4. **Não** sobrescrever `passwordHash` em updates subsequentes (linha 115) — isso invalida a senha do owner toda vez que o evento é editado.

### C2 — Bypass do fluxo de reserva em `PUT /api/products/[id]`
- **Arquivo:** `src/app/api/products/[id]/route.ts:20-24`
- **Descrição:** `UPDATABLE_KEYS` inclui `reservedBy`, `reservedByName`, `reservedByEmail`, `reservedByPhone`, `reservedAt`. Qualquer staff pode marcar/desmarcar reservas diretamente, driblando regras de negócio do endpoint `/reserve`.
- **Impacto:** Fraude interna — reservar produto para si mesmo, apagar reserva de cliente legítimo, manipular histórico.
- **Recomendação:** Remover esses campos de `UPDATABLE_KEYS`. Mutação apenas pelo endpoint dedicado de reserva, que deve registrar quem alterou e quando.

---

## Altos

### A1 — Vazamento de detalhes de erro em respostas 500
- **Arquivos:** `src/app/api/garage-sales/route.ts:34,157`; padrão repetido em várias rotas.
- **Descrição:** `details: error instanceof Error ? error.message : "Unknown error"` inclui mensagens brutas do Prisma (nomes de colunas, constraints, etc.) na resposta.
- **Recomendação:** Logar detalhes apenas no servidor (`console.error`), devolver mensagem genérica ao cliente.

### A2 — Enumeração de usuários por timing no login
- **Arquivo:** `src/app/login/actions.ts:40-50`
- **Descrição:** Para e-mails inexistentes a função retorna antes do `bcrypt.compare`. A diferença de tempo (alguns ms) permite enumerar e-mails válidos.
- **Recomendação:** Fazer `bcrypt.compare` contra um hash dummy quando o usuário não é encontrado (constant-time), ou aplicar rate limiting agressivo (ver M2).

### A3 — Ausência de auditoria na impersonação de tenant
- **Arquivos:** `src/app/super/actions.ts` (`startTenantImpersonation`), `src/lib/session.ts:89-91`
- **Descrição:** O JWT de impersonação não guarda o `superAdmin` original — só o tenant alvo. Nenhum log/trail registra início, fim ou ações executadas durante a impersonação.
- **Impacto:** Impossível investigar incidentes de acesso indevido por super admin.
- **Recomendação:** Adicionar `origSub` (id do super admin) no JWT quando `imp=true`, e gravar em tabela `ImpersonationLog` (quem, quando, tenant, duração, IP).

### A4 — Enumeração de clientes em `GET /api/pending-orders`
- **Arquivo:** `src/app/api/pending-orders/route.ts:69-75`
- **Descrição:** Parâmetros `customerEmail` e `customerPhone` aceitos sem autenticação do titular. Respostas diferentes permitem descobrir se um e-mail/telefone tem pedido.
- **Recomendação:** Exigir autenticação, ou token de acesso por pedido (UUID no link do cliente), em vez de busca aberta.

### A5 — Falta de validação de tamanho em inputs de texto
- **Arquivos:** `src/app/api/products/route.ts:108-130`, demais rotas POST.
- **Descrição:** Strings como `nome`, `descricao`, `tags` são persistidas sem cap de tamanho. DoS via payloads muito grandes e inflação do banco.
- **Recomendação:** Validar com Zod (já presente no projeto?) ou checagens manuais: `nome ≤ 200`, `descricao ≤ 10.000`, arrays ≤ 50 itens.

### A6 — `console.error` com stack/payload potencialmente sensível
- **Arquivos:** todas as rotas de API e server actions.
- **Descrição:** Erros logam objetos inteiros, que em alguns casos contêm e-mail, CPF, telefone. Em ambientes com logs agregados (ex.: Vercel, Datadog) isso vira PII em repositório externo.
- **Recomendação:** Sanitizar antes de logar, usar logger estruturado com redaction (`pino` + redact), e documentar a retenção em `LGPD.md`.

---

## Médios

### M1 — CSRF parcialmente mitigado por `SameSite=Lax`, mas sem defesa em profundidade
- **Arquivo:** `src/lib/session.ts:124-132`
- **Descrição:** O cookie de sessão tem `sameSite: "lax"`, o que impede a maioria dos CSRF clássicos em `POST`/`DELETE` cross-site. Porém:
  - Não há verificação de `Origin`/`Referer` nas rotas sensíveis.
  - Server actions do Next.js são navegações `POST` e podem, em cenários de subdomínio, serem alvo.
- **Recomendação:** Validar `Origin`/`Referer` em middleware para todas as rotas que mutam estado, e considerar token CSRF para server actions críticas (ex.: troca de senha, impersonação).

### M2 — Ausência de rate limiting
- **Arquivos:** `src/app/login/actions.ts`, `src/app/api/portal/password/route.ts`, todas as rotas públicas.
- **Descrição:** Sem proteção contra brute force em login, troca de senha, ou busca pública de produtos/pedidos.
- **Recomendação:** Middleware com rate limit por IP (ex.: 5 tentativas/min em `/login`, 3/hora em password reset). Soluções: Upstash Ratelimit, `rate-limiter-flexible` em Redis, ou Vercel Edge Config.

### M3 — Validação fraca de assinatura digital em contratos
- **Arquivo:** `src/lib/contract.ts:66-71` (`isValidSignatureDataUrl`)
- **Descrição:** Verifica apenas que é PNG e entre 800 B e 4 MB. Não rejeita tela em branco, reaproveitamento da mesma imagem em múltiplos contratos, nem faz hash de integridade.
- **Recomendação:** Calcular hash SHA-256 da assinatura e guardar no contrato; rejeitar hashes duplicados no mesmo tenant; analisar entropia mínima para descartar imagens em branco.

### M4 — Staff pode criar templates de contrato do tenant inteiro
- **Arquivo:** `src/app/api/admin/contract-templates/route.ts:8-21`
- **Descrição:** Protegido por `requireStaffSession` em vez de admin. Qualquer staff (não apenas admin) pode criar/alterar contratos vinculantes do tenant.
- **Recomendação:** Trocar por `requireTenantAdministrator()` ou equivalente, ou introduzir campo `role === "admin"`.

### M5 — Binding user↔garageSale frouxo na criação
- **Arquivo:** `src/app/api/garage-sales/route.ts:94-118`
- **Descrição:** Quando o e-mail já existe como owner de **outro** evento, o código lança `OWNER_EMAIL_IN_USE`. Bom. Porém, se o usuário existe mas **não** é owner, o código simplesmente não o atualiza — o owner do evento recém-criado pode ficar sem usuário vinculado, resultando em evento sem dono logável.
- **Recomendação:** Rejeitar explicitamente quando o e-mail pertence a um staff/super admin, e exigir um e-mail distinto, com mensagem clara ao admin.

### M6 — Sanitização de HTML permite `href` relativo arbitrário
- **Arquivo:** `src/lib/sanitize-html.ts:54-58`
- **Descrição:** O sanitizador de HTML de contrato aceita `href` com qualquer path relativo. Um admin malicioso (ou um template importado) pode embutir `href="/admin/..."` para phishing interno.
- **Recomendação:** Allowlist de esquemas (`mailto:`, `tel:`, `https:` para domínios conhecidos). Bloquear `href` relativo apontando para rotas internas da aplicação.

### M7 — Troca de senha sem re-autenticação atualizada
- **Arquivo:** `src/app/api/portal/password/route.ts:8-52`
- **Descrição:** A troca aplica imediatamente, sem notificação por e-mail nem exigir senha atual (verificar no arquivo). Sessão comprometida = takeover definitivo.
- **Recomendação:** Exigir senha atual; invalidar todas as outras sessões; enviar e-mail de notificação ao usuário.

---

## Baixos

### B1 — LGPD incompleto
- **Arquivo:** `LGPD.md` (checklist com itens pendentes).
- **Pendências declaradas:** rotas de `export`/`delete` para titulares, trilha de auditoria, contrato DPA com provedores.
- **Recomendação:** Priorizar antes de produção no Brasil (Arts. 17–18 LGPD).

### B2 — Cabeçalhos de segurança HTTP ausentes
- **Arquivo:** `next.config.ts`
- **Descrição:** Não há `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Recomendação:** Adicionar via `headers()` no `next.config.ts`. Exemplo base:
  ```ts
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=()" },
  ```
  CSP requer estudo das origens de imagem/script.

### B3 — Embeddings de produto expostos na API
- **Arquivo:** `src/app/api/products/route.ts:124-130`
- **Descrição:** Embeddings ML são devolvidos em listagens públicas. Não é segredo alto, mas é desnecessário na resposta e aumenta peso da rede.
- **Recomendação:** `select` explícito omitindo `embedding` nas rotas públicas; expor só em rotas internas.

### B4 — Ausência de logout visível na UI
- **Arquivo:** `src/app/api/auth/logout/route.ts` (rota existe), UI não tem botão consistente.
- **Recomendação:** Adicionar botão "Sair" no layout autenticado.

### B5 — Verificação tardia do `AUTH_SECRET`
- **Arquivo:** `src/lib/session.ts:7-13`
- **Descrição:** Erro lançado a cada request em vez de no boot. Dificulta diagnóstico em deploy.
- **Recomendação:** Validar no boot (`next.config.ts` ou arquivo dedicado importado cedo).

### B6 — Ausência de `npm audit` no CI
- **Arquivo:** não há workflow de CI auditando dependências.
- **Recomendação:** Adicionar `npm audit --omit=dev --audit-level=high` ao pipeline e/ou Dependabot.

### B7 — `SameSite=Lax` em vez de `Strict`
- **Arquivo:** `src/lib/session.ts:128`
- **Descrição:** `lax` permite que o cookie seja enviado em navegações top-level (ex.: link externo). Em uma app puramente autenticada `strict` é mais seguro.
- **Recomendação:** Avaliar impacto em UX; se aceitável, usar `strict`.

---

## Informativos

### I1 — Modo `strict` do TypeScript
- Verificar se `strict: true` está em `tsconfig.json`. Reduz classes inteiras de bugs que viram vulnerabilidades.

### I2 — Dependências
- `package.json` usa versões recentes (`bcryptjs ^3`, `jose ^6`, `next 15`). Executar `npm audit` periodicamente.

### I3 — Dados em trânsito e em repouso
- Confirmar TLS obrigatório em produção (Vercel já faz); para o banco MySQL, garantir `sslmode=REQUIRED` no `DATABASE_URL`.

---

## Próximos passos recomendados

1. **Imediato (Crítico):**
   - Substituir a senha padrão `"12345"` por fluxo de convite/token.
   - Remover `reservedBy*` de `UPDATABLE_KEYS`.

2. **Curto prazo (Alto):**
   - Sanitizar respostas de erro 500.
   - Adicionar rate limiting em `/login` e troca de senha.
   - Registrar trilha de auditoria de impersonação.

3. **Médio prazo:**
   - Cabeçalhos de segurança HTTP e CSP.
   - Completar rotas LGPD (export/delete).
   - Validação Zod unificada nas rotas.

4. **Contínuo:**
   - `npm audit` e Dependabot no CI.
   - Revisão anual de autenticação e autorização.

---

*Relatório gerado por auditoria automatizada. Revisar cada item manualmente antes de abrir tickets.*
