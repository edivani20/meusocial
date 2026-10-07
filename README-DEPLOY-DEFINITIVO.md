# Deploy definitivo do MeuSocial no Render

## Diagnóstico

O commit `95fa7b4` já está no GitHub com a correção de localização. Porém, os endereços antigos abaixo respondem `404 Not Found`:

- `https://social-g1ub.onrender.com`
- `https://meusocial-frontend.onrender.com`

Isso significa que o frontend não está sendo servido por um Static Site ativo no Render. Não é problema de cache nem da permissão do navegador.

## Opção recomendada: criar os serviços pelo Blueprint

1. No Render, abra **New + → Blueprint**.
2. Selecione o repositório `edivani20/meusocial`.
3. Se o Render perguntar sobre o arquivo Blueprint, escolha `render.yaml`.
4. Confirme a criação dos dois serviços:
   - `meusocial-api` — Web Service Node, diretório `backend`.
   - `meusocial-frontend` — Static Site, diretório `frontend`.
5. Aguarde os dois serviços terminarem o deploy.
6. Copie a URL real que aparecer no cartão do serviço `meusocial-frontend`. Não use `social-g1ub.onrender.com` se ela não for a URL exibida no painel.

## Se os serviços já existirem

No serviço do backend:

- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

No serviço do frontend:

- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`

Depois clique em **Manual Deploy → Deploy latest commit** nos dois serviços. O frontend e o backend devem usar o commit `95fa7b4` ou posterior.

## Teste obrigatório do backend

Substitua `<API_URL>` pela URL real do serviço `meusocial-api`:

```bash
curl -i -X PUT https://<API_URL>/api/perfil/localizacao \
  -H 'Content-Type: application/json' \
  -d '{}'
```

O retorno correto é `400` com erro de localização inválida. Se retornar `404`, o backend ainda está usando uma versão antiga ou o serviço está apontando para outro repositório.

## Teste obrigatório do frontend

Abra a URL real do Static Site. Ela deve mostrar a tela de login, e o HTML não deve responder `Not Found`.

Depois entre na conta, abra **Perto**, clique em **Ativar localização** e permita. Repita com os demais usuários.

## Importante

O link de compartilhamento agora usa automaticamente o domínio atual aberto no navegador. Assim, ele não depende mais do endereço antigo `social-g1ub.onrender.com`.
