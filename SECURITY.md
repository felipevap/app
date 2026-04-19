# Portal Garage — Revisão de Segurança

Esta nota resume o estado atual dos controles de segurança e identifica
melhorias já aplicadas e pendentes nesta branch.

## Inventário do que já está implementado

- **Autenticação**: JWT HS256 assinado com `AUTH_SECRET` (≥ 32 chars) via
  `jose`. Expiração de 7 dias. Cookies `HttpOnly`, `SameSite=Lax`, `Secure`
  em produção (`src/lib/session.ts`).
- **Hash de senha**: bcrypt, 12 rodadas (`src/app/associacao/actions.ts`).
- **Isolamento multi-tenant**: filtros `tenantId` em queries Prisma
  (`src/lib/tenant-scope.ts`, `require-staff`, `require-owner`).
- **Validação de entrada**:
  - `isValidSignatureDataUrl` no aceite de contratos (PNG, 800–4 MB).
  - Embeddings de produtos validados com tamanho 1024.
  - Novo: `src/lib/contract-validation.ts` — sanitiza HTML, limita
    comprimento de nome/texto/parâmetros e rejeita nomes de parâmetro inválidos.
  - Novo: `filledParams` só aceita chaves declaradas pelo template e falha
    quando um parâmetro obrigatório está vazio.
- **Sanitização de HTML do contrato**: `src/lib/sanitize-html.ts` aplica
  whitelist rígida de tags/atributos/estilos antes de qualquer render com
  `dangerouslySetInnerHTML` (portal de aceite, edição do evento, painel do
  proprietário, pré-visualização do admin). Bloqueia `<script>`, `<style>`,
  comentários, CDATA, `javascript:`, `url(...)` e `expression(...)`.
- **Rendering HTML escapando variáveis**: `renderContractBody` escapa
  valores dos parâmetros antes de injetar no HTML, evitando XSS por valor
  preenchido pelo proprietário ao assinar.

## Mudanças recentes desta branch

1. Novo fluxo de contratos baseado em rich-text + pills drag-and-drop —
   backend passa a armazenar HTML validado. Todo o HTML que sai do banco
   é re-sanitizado no cliente antes de renderizar.
2. Validação de `POST/PUT /api/admin/contract-templates` e
   `/api/garage-sales/[id]/contract-template` endurecida (tamanhos,
   nomes de parâmetro, parâmetros obrigatórios).
3. DELETE da associação contrato↔evento agora bloqueia remoção quando já
   existe aceite assinado.
4. Matching de produtos (`findMatchingProducts`) deixa de aceitar
   scores-fantasma quando não há embedding — produtos sem índice visual
   não entram no ranking, evitando falsos positivos.

## Riscos residuais / recomendações

- **Rate limiting**: nenhuma rota API aplica rate limiting hoje. Antes de
  expor publicamente, adicionar middleware (p.ex. `@upstash/ratelimit`) em
  `/api/login`, `/api/admin/*`, `/api/portal/*`, `/api/pending-orders`.
- **CSRF**: as rotas sensíveis usam cookies `SameSite=Lax`, mas não há
  verificação explícita de `Origin/Referer`. Como mitigação adicional,
  recomendo verificar o header `Origin` nas rotas `POST/PUT/DELETE`.
- **Headers de resposta**: configurar `next.config.ts` com
  `Strict-Transport-Security`, `Content-Security-Policy`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **Logs**: `console.error` vaza potencialmente PII; encaminhar para um
  logger estruturado com scrubbing.
- **Backup e rotação de segredos**: documentar rotação de `AUTH_SECRET` e
  estratégia de revogação em massa (mudar a chave invalida sessões).
- **Upload de imagens**: hoje salvamos imagens como dataURL no JSON do
  `Product`. Migrar para armazenamento dedicado (S3/R2) com URLs assinadas
  reduz superfície (XSS via SVG, custo de banco).
- **Modelos ML no cliente**: os modelos carregam de `/models/yolo26n` no
  mesmo origin, bom. Verificar integridade em CI (checksum) para impedir
  substituição maliciosa em deploy.
- **Dependências**: rodar `npm audit` periodicamente (`bcryptjs`, `jose`,
  `@tensorflow/tfjs` estão atualizados).

## Processo de divulgação responsável

Envie relatos de vulnerabilidade para `privacidade@portal-garage.local`
(placeholder — trocar pelo contato real do DPO). Resposta em até 5 dias
úteis. Não divulgue publicamente sem contato prévio.
