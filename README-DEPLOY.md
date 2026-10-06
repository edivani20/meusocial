# Desabafa Coração — pacote preparado para GitHub e Render

## Estrutura

- `backend/`: API Node.js/Express
- `frontend/`: aplicação Vue/Vite
- `render.yaml`: configuração opcional para criar os dois serviços no Render

## Importante

O arquivo `.env` real e o banco SQLite não fazem parte deste pacote. Cadastre as variáveis secretas no painel do Render. Gere novas chaves se as credenciais anteriores foram expostas.

## Publicação manual no Render

### Backend — Web Service

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Plan: `Free`

### Frontend — Static Site

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Plan: `Free`

O frontend já está apontado para `https://meusocial-api.onrender.com`.

## Publicação pelo GitHub

Na raiz deste pacote:

```bash
git init
git add .
git commit -m "Preparar projeto para Render"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

## Variáveis do backend

Consulte `backend/.env.example`. Nunca envie chaves reais ao GitHub.

## Observação sobre SQLite

O plano gratuito do Render pode perder arquivos locais após reinício ou suspensão. Como este projeto usa SQLite, os dados são adequados apenas para testes. Para produção, use um banco persistente.
