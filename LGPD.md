# Conformidade LGPD — Portal Garage

Checklist operacional para assegurar conformidade com a Lei nº 13.709/2018.

## 1. Papéis

- **Controlador**: organização cliente (tenant) que opera o evento.
- **Operador**: plataforma Portal Garage.
- **Encarregado (DPO)**: `privacidade@portal-garage.local` (substituir pelo
  contato real na produção).

## 2. Dados pessoais tratados

| Categoria | Dados | Base legal |
|-----------|-------|------------|
| Cadastro da organização | nome, e-mail, CPF, CEP, PIX | Execução de contrato |
| Proprietário do evento | nome, e-mail, CPF, telefone, assinatura digital | Execução de contrato |
| Comprador | nome, telefone, e-mail, pedidos pendentes | Execução de contrato |
| Produtos | fotos enviadas, embeddings visuais | Legítimo interesse |
| Técnicos | cookies de sessão, session_id local | Execução de contrato / legítimo interesse |

## 3. Princípios aplicados (art. 6º LGPD)

- **Finalidade**: dados coletados somente para operar eventos e contratos.
- **Adequação/Necessidade**: campos mínimos solicitados em cadastro (CPF
  apenas quando requerido para contrato/PIX).
- **Segurança**: JWT, bcrypt, isolamento por tenant, sanitização de HTML,
  cookies seguros. Detalhes em `SECURITY.md`.
- **Transparência**: `/politica-privacidade` e `/termos` acessíveis no
  rodapé da landing page.
- **Prevenção/não-discriminação/responsabilização**: trilhas de
  auditoria (contrato aceito → `renderedBody` + carimbo de tempo + e-mail
  do assinante) permitem demonstrar conformidade.

## 4. Direitos do titular (art. 18)

Fluxos previstos:
- **Acesso e portabilidade**: exportação dos dados do proprietário via
  painel (pendente — criar rota `/api/portal/me/export` em milestone
  futuro).
- **Correção**: proprietário edita dados cadastrais no painel; admin
  edita na área administrativa.
- **Exclusão**: exclusão lógica (`deletedAt`) já existente em `GarageSale`
  e `Product`. Para usuários, implementar fluxo de exclusão definitiva
  sob demanda (pendente).
- **Oposição/revogação do consentimento**: não usamos marketing — não se
  aplica ao fluxo atual.

## 5. Retenção

- Dados cadastrais e de contrato: até 5 anos após encerramento do tenant
  (obrigação fiscal/civil).
- Embeddings e imagens de produtos: enquanto o evento existir; apagados
  junto com a exclusão em cascata do `GarageSale` (Prisma `onDelete:
  Cascade`).
- Cookies de sessão: 7 dias.

## 6. Pendências priorizadas

1. Formalizar contrato de operador com provedores de nuvem (DPA).
2. Ritual trimestral de revisão de permissões de usuários staff.
3. Criar rotas `export` e `delete` para titulares autenticados.
4. Adicionar banner de cookies quando/​se ativarmos analytics de terceiros
   (hoje não há — banner não exigido).
5. Publicar contato real do DPO ao ir a produção.

## 7. Incidentes

Registrar toda suspeita de incidente em `incidents/` (a criar) com:
- Carimbo de tempo
- Tenants/titulares afetados
- Natureza dos dados
- Medidas de contenção
- Comunicação à ANPD (quando aplicável, art. 48) em até 72 h.
