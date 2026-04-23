# Portal Garage — app desktop (Windows e macOS)

Cliente Electron que abre primeiro o **login** do Portal Garage na URL configurada e mantém a sessão no perfil persistente do Chromium (`partition`). Funciona em **Windows** e **macOS** com os mesmos fontes; os instaladores são gerados separadamente por plataforma.

## Requisitos

- Node.js 20+
- Conta e deploy do site Next em produção (HTTPS recomendado para cookies `Secure`).

## URL do site

Por omissão a app abre **`https://portalgarage.com.br`**. No arranque, se existir cookie de sessão **`gg_session`** no perfil persistente, abre **`/administracao`** (o middleware do site encaminha super admin para `/super` e dono para `/portal`). Sem sessão, abre **`/login`**. Para outro ambiente: **`PORTAL_GARAGE_APP_URL`**, **`app-base-url.txt`** na pasta de dados, ou **Arquivo → Definir URL do site…**.

## Desenvolvimento

```bash
cd garage-desktop
npm install
set PORTAL_GARAGE_APP_URL=https://seu-dominio.com
npm start
```

No macOS/Linux:

```bash
export PORTAL_GARAGE_APP_URL=https://seu-dominio.com
npm start
```

## Gerar instaladores

| Plataforma | Comando | Nota |
|------------|---------|------|
| **Windows** | `npm run dist:win` | Gera `.exe` (NSIS). Execute em Windows ou num runner CI Windows. |
| **macOS** | `npm run dist:mac` | Gera `.dmg` e `.zip`. Execute em macOS ou num runner CI macOS (Apple notarization opcional). |
| Ambas | `npm run dist:all` | Exige ambiente capaz de compilar para os dois alvos (em geral usa-se CI com matriz win + mac). |

Artefactos ficam em `garage-desktop/out-build/`.

## Variáveis de ambiente no build / execução

- `PORTAL_GARAGE_APP_URL` — URL base do site (ex.: `https://app.portalgarage.com`). Em desenvolvimento pode ser `http://localhost:3000`.

## Página de download no site

O site Next expõe `/download` e lê `DESKTOP_RELEASES_JSON` para mostrar links dos ficheiros `.exe` e `.dmg` hospedados (R2, S3, GitHub Releases, etc.).

## Comportamento

1. Arranque em `/login` (obrigatório passar pelo fluxo do site).
2. Após redirecionamento para áreas autenticadas, o menu permite ir a `/pos`, painel, etc.
3. **Sincronizar fila agora** envia vendas pendentes gravadas em `outbox.json` no diretório de dados do utilizador (extensível para PDV offline completo).

## macOS

- Menu da aplicação no topo do ecrã (padrão macOS).
- `Cmd+Q` para sair.

## Windows

- Menu na janela.
- Fechar a última janela encerra a aplicação.
