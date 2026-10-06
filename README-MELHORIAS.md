# Desabafa Coração — versão renovada

## O que foi melhorado

- Identidade visual com gradiente roxo/rosa e cartões modernos.
- Feed com cards, sombras, espaçamento e estados de carregamento skeleton.
- Check-in de humor: Bem, Ok, Triste, Irritado e Ansioso.
- Botão de publicação em destaque e botão flutuante no celular.
- Notificações toast no lugar dos alertas do feed e da área VIP.
- Tela de login mais emocional, com mensagem de acolhimento.
- Página VIP com benefícios mais claros e visual premium.
- Menu lateral para desktop e navegação inferior para celular.
- Modo escuro com botão no cabeçalho.
- Melhorias de responsividade e microanimações.
- Gemini corrigida com modelos válidos (`gemini-2.5-flash` como padrão).
- Resposta automática agendada entre 2 e 5 minutos após um novo desabafo.
- A IA verifica se alguém da comunidade já respondeu e não interrompe a conversa.
- Modal de conselhos mostra 3 respostas inicialmente e permite expandir com “Ver todos”.

## Como executar no Windows

Abra dois PowerShells.

### Backend

```powershell
cd C:\xampp\htdocs\dashboard\social\backend
npm install
npm run dev
```

O backend inicia em `http://localhost:3000`.

> Depois desta atualização, reinicie o backend para carregar a nova configuração da Gemini. Mantenha `GEMINI_API_KEY` no arquivo `backend/.env` e não publique esse arquivo no GitHub.

### Frontend

```powershell
cd C:\xampp\htdocs\dashboard\social\frontend
npm install
npm run dev
```

Abra o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

## Produção

Para gerar uma versão de produção do frontend:

```powershell
cd frontend
npm run build
```

A pasta `frontend/dist` será criada pelo Vite.

## Usando Groq no lugar da Gemini

O backend agora prioriza a Groq quando `GROQ_API_KEY` estiver preenchida:

```env
GROQ_API_KEY=sua_chave_groq
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3000
```

A Groq responde em poucos segundos quando chamada. O Desabafa, porém, espera de 2 a 5 minutos antes de publicar a resposta automática, para dar tempo à comunidade de responder. Se alguém responder nesse intervalo, a IA não publica resposta.

## Prioridade do feed

O feed agora ordena nesta prioridade:

1. Desabafos humanos ainda sem conselho humano.
2. Desabafos humanos já respondidos.
3. Publicações simuladas/fake.

A API da Groq também consulta os modelos disponíveis para a chave e escolhe automaticamente um modelo compatível. Assim, se `llama-3.3-70b-versatile` não estiver liberado, o backend tenta `openai/gpt-oss-20b`, `openai/gpt-oss-120b` ou outro modelo compatível.
