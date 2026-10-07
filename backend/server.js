const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OAuth2Client } = require('google-auth-library');
const db = require('./database');
require('dotenv').config();

process.env.TZ = 'America/Sao_Paulo';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const MP_ACCESS_TOKEN = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
const APP_URL = (process.env.APP_URL || 'https://meusocial-frontend.onrender.com').replace(/\/$/, '');
const MP_NOTIFICATION_URL = (process.env.MERCADOPAGO_NOTIFICATION_URL || 'https://meusocial-api.onrender.com/api/pagamentos/webhook').trim();
const PLANOS_PAGAMENTO = {
    Destaque: { titulo: 'Destaque 24h - Desabafa Coração', valor: 5.00 },
    Premium: { titulo: 'Desabafa Premium - 30 dias', valor: 19.90 }
};

async function mercadoPagoRequest(path, options = {}) {
    if (!MP_ACCESS_TOKEN) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado no Render.');
    const resposta = await fetch(`https://api.mercadopago.com${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados?.message || dados?.error || `Mercado Pago HTTP ${resposta.status}`);
    return dados;
}

// ==========================================
// INICIALIZAÇÃO DA IA (Groq ou Gemini)
// ==========================================
let genAI = null;
let MODELO_ATIVO = null;
let PROVEDOR_IA = null;
let iaInicializada = false;
let iaProntaResolve;
const iaPronta = new Promise(resolve => { iaProntaResolve = resolve; });

async function inicializarIA() {
    const groqKey = (process.env.GROQ_API_KEY || '').trim();
    if (groqKey) {
        try {
            const modelosRes = await fetch('https://api.groq.com/openai/v1/models', {
                headers: { 'Authorization': `Bearer ${groqKey}` }
            });
            const modelosDados = await modelosRes.json();
            if (!modelosRes.ok) throw new Error(modelosDados?.error?.message || `Groq HTTP ${modelosRes.status}`);
            const disponiveis = (modelosDados.data || []).map(modelo => modelo.id);
            const solicitado = process.env.GROQ_MODEL || '';
            const preferidos = [solicitado, 'openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.3-70b-versatile'].filter(Boolean);
            MODELO_ATIVO = preferidos.find(modelo => disponiveis.includes(modelo));
            if (!MODELO_ATIVO) throw new Error('Nenhum modelo de texto disponível para esta chave Groq.');
            PROVEDOR_IA = 'Groq';
            iaInicializada = true;
            iaProntaResolve(true);
            console.log(`✅ Groq ativo com o modelo: ${MODELO_ATIVO}`);
            if (solicitado && solicitado !== MODELO_ATIVO) console.log(`ℹ️ Modelo ${solicitado} não está disponível; usando ${MODELO_ATIVO}.`);
            return;
        } catch (error) {
            console.log('⚠️ Groq não pôde ser inicializado:', error.message);
            iaProntaResolve(false);
            return;
        }
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'AIzaSyDummyKey' || apiKey.length <= 10) {
        console.log('⚠️ Nenhuma API de IA configurada. Use GROQ_API_KEY ou GEMINI_API_KEY.');
        iaProntaResolve(false);
        return;
    }

    try {
        genAI = new GoogleGenerativeAI(apiKey);
        const modelos = [process.env.GEMINI_MODEL || 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        for (const modelo of [...new Set(modelos)]) {
            try {
                const testModel = genAI.getGenerativeModel({ model: modelo });
                const result = await testModel.generateContent('Responda apenas: OK');
                if (result.response && result.response.text()) {
                    PROVEDOR_IA = 'Gemini';
                    MODELO_ATIVO = modelo;
                    iaInicializada = true;
                    iaProntaResolve(true);
                    console.log(`✅ Gemini ativo com o modelo: ${MODELO_ATIVO}`);
                    return;
                }
            } catch (e) {
                console.log(`⚠️ Modelo ${modelo} indisponível: ${e.message.substring(0, 100)}`);
            }
        }
        console.log('⚠️ Nenhum modelo Gemini disponível.');
        iaProntaResolve(false);
    } catch (error) {
        console.log('⚠️ IA desativada:', error.message);
        iaProntaResolve(false);
    }
}

inicializarIA();

async function esperarIA() {
    if (iaInicializada) return true;
    return Promise.race([iaPronta, new Promise(resolve => setTimeout(() => resolve(false), 15000))]);
}

async function gerarComGroq(prompt) {
    const resposta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: MODELO_ATIVO,
            messages: [
                { role: 'system', content: 'Você é um assistente acolhedor de uma comunidade de apoio emocional. Seja empático, responsável e objetivo.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 300
        })
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados?.error?.message || `Groq HTTP ${resposta.status}`);
    return dados?.choices?.[0]?.message?.content?.trim() || null;
}

async function gerarComIA(prompt) {
    if (!iaInicializada || !MODELO_ATIVO) return null;
    try {
        if (PROVEDOR_IA === 'Groq') return await gerarComGroq(prompt);
        const model = genAI.getGenerativeModel({ model: MODELO_ATIVO });
        const resultado = await model.generateContent(prompt);
        return resultado.response.text().trim();
    } catch (error) {
        console.error(`⚠️ Erro na ${PROVEDOR_IA || 'IA'}:`, error.message);
        return null;
    }
}

// ==========================================
// FUNÇÕES DE NOTIFICAÇÃO
// ==========================================
function enviarNotificacao(usuarioEmail, mensagem, desabafo_id, conselho_id = null) {
    if (!usuarioEmail) return;
    db.run(
        `INSERT INTO notificacoes (usuario, mensagem, desabafo_id, conselho_id) VALUES (?, ?, ?, ?)`,
        [usuarioEmail, mensagem, desabafo_id, conselho_id],
        function(err) {
            if (err) console.error('Erro ao salvar notificação:', err);
            else console.log(`🔔 Notificação enviada para ${usuarioEmail}`);
        }
    );
}

function notificarTodosParticipantes(desabafo_id, autorResposta, textoResposta, isBot = false) {
    db.get(`SELECT autor FROM desabafos WHERE id = ?`, [desabafo_id], (err, desabafo) => {
        if (err || !desabafo) return;
        const autorDesabafo = desabafo.autor;
        const textoCurto = textoResposta ? textoResposta.substring(0, 50) : '';
        
        db.all(`
            SELECT DISTINCT autor FROM conselhos WHERE desabafo_id = ? 
            UNION SELECT ? as autor
        `, [desabafo_id, autorDesabafo], (err, participantes) => {
            if (err || !participantes) return;
            
            participantes.forEach(p => {
                if (p.autor === autorResposta) return;
                if (p.autor.includes('bot_')) return;
                
                db.get(`SELECT usuario FROM usuarios WHERE nome_exibicao = ? OR usuario = ?`, 
                [p.autor, p.autor], (err, usuarioParticipante) => {
                    if (err || !usuarioParticipante) return;
                    
                    let mensagem = '';
                    if (p.autor === autorDesabafo) {
                        mensagem = `💬 ${autorResposta} respondeu ao seu desabafo: "${textoCurto}..."`;
                    } else {
                        mensagem = `💬 ${autorResposta} respondeu na conversa: "${textoCurto}..."`;
                    }
                    if (isBot) {
                        mensagem = `🤖 ${autorResposta} respondeu na conversa: "${textoCurto}..."`;
                    }
                    enviarNotificacao(usuarioParticipante.usuario, mensagem, desabafo_id);
                });
            });
        });
    });
}

// ==========================================
// AGENDAR RESPOSTA DA IA
// ==========================================
async function agendarRespostaIA(desabafo_id, desabafoTexto, autorIA, bot) {
    const pronta = await esperarIA();
    if (!pronta || !iaInicializada || !MODELO_ATIVO) {
        console.log('⚠️ IA não está ativa; resposta automática não agendada.');
        return;
    }

    // Entre 2 e 5 minutos: dá espaço para a comunidade responder primeiro.
    const delay = Math.floor(Math.random() * 180000) + 120000;
    console.log(`⏳ IA ${autorIA} vai responder em ${(delay/1000).toFixed(1)} segundos...`);
    
    setTimeout(async () => {
        try {
            db.all(`SELECT autor, texto FROM conselhos WHERE desabafo_id = ? ORDER BY id ASC`, [desabafo_id], async (err, historico) => {
                if (err) return;
                const houveRespostaHumana = (historico || []).some(msg => {
                    const autor = String(msg.autor || '').toLowerCase();
                    return !autor.includes('bot_') && !autor.includes('anônimo');
                });
                if (houveRespostaHumana) {
                    console.log(`⏭️ IA não respondeu ao desabafo ${desabafo_id}: já existe resposta humana.`);
                    return;
                }

                let historicoTexto = '';
                if (historico && historico.length > 0) {
                    historicoTexto = historico.map(msg => `${msg.autor}: "${msg.texto}"`).join('\n');
                }
                
                const promptResposta = `Você é ${bot.nome_exibicao}, uma pessoa real continuando uma conversa sobre relacionamentos.
                
Desabafo original: "${desabafoTexto}"

Histórico da conversa:
${historicoTexto}

Continue a conversa como ${bot.nome_exibicao}. Responda de forma natural (máx 4 frases). Seja empática e acolhedora.`;
                
                atualizarDigitando(desabafo_id, `bot:${bot.nome_exibicao}`, bot.nome_exibicao, true);
                const respostaIA = await gerarComIA(promptResposta);
                atualizarDigitando(desabafo_id, `bot:${bot.nome_exibicao}`, bot.nome_exibicao, false);
                
                if (respostaIA && respostaIA.length > 10) {
                    const textoConselho = filtrarPalavroes(respostaIA);
                    db.run(
                        `INSERT INTO conselhos (desabafo_id, autor, foto_autor, texto, is_bot) VALUES (?, ?, ?, ?, 1)`,
                        [desabafo_id, bot.nome_exibicao, bot.foto_perfil || '', textoConselho],
                        function(err) {
                            if (err) console.error('Erro ao salvar resposta da IA:', err);
                            else {
                                console.log(`🤖 IA ${bot.nome_exibicao} respondeu após ${(delay/1000).toFixed(1)}s`);
                                notificarTodosParticipantes(desabafo_id, bot.nome_exibicao, textoConselho, true);
                            }
                        }
                    );
                }
            });
        } catch (error) {
            console.error('Erro ao agendar resposta da IA:', error);
        }
    }, delay);
}

// ==========================================
// LISTA DE PALAVRAS OFENSIVAS
// ==========================================
const PALAVRAS_OFENSIVAS = [
    'puta', 'puto', 'caralho', 'porra', 'merda', 'bosta', 'fdp', 'filhadaputa',
    'viado', 'bicha', 'sapatão', 'corno', 'chifrudo', 'otário', 'otario',
    'idiota', 'imbecil', 'retardado', 'mongol', 'mongoloide', 'trouxa',
    'vagabundo', 'vagabunda', 'lixo', 'escroto', 'babaca', 'arrombado',
    'fuder', 'fodase', 'foda-se', 'desgraçado', 'miserável', 'nojento',
    'cu', 'buceta', 'piroca', 'pau', 'cacete', 'vsf', 'vai se fuder'
];

function filtrarPalavroes(texto) {
    if (!texto) return texto;
    let textoFiltrado = texto;
    PALAVRAS_OFENSIVAS.forEach(palavra => {
        const regex = new RegExp(palavra, 'gi');
        textoFiltrado = textoFiltrado.replace(regex, '****');
    });
    return textoFiltrado;
}

function detectarPalavroes(texto) {
    if (!texto) return false;
    const textoLower = texto.toLowerCase();
    return PALAVRAS_OFENSIVAS.some(palavra => textoLower.includes(palavra.toLowerCase()));
}

// ==========================================
// CRIA USUÁRIOS BOTS
// ==========================================
function criarBots() {
    const nomesBots = [
        'Ana_Conselhos', 'Pedro_Amor', 'Maria_S2', 'Joao_Real', 'Carla_Help',
        'Rafaela_Smile', 'Lucas_Heart', 'Bruna_Amor', 'Thiago_Care', 'Amanda_Love'
    ];

    nomesBots.forEach((nome, index) => {
        const usuario = `bot_${nome.toLowerCase()}`;
        db.get(`SELECT * FROM usuarios WHERE usuario = ?`, [usuario], (err, row) => {
            if (!row) {
                db.run(
                    `INSERT INTO usuarios (usuario, senha, nome_exibicao, foto_perfil, bio, is_online) 
                     VALUES (?, ?, ?, ?, ?, 1)`,
                    [
                        usuario,
                        'BOT_AUTH_' + index,
                        nome,
                        `https://ui-avatars.com/api/?name=${nome.replace('_', '+')}&background=6C63FF&color=fff&size=128`,
                        `Conselheiro(a) 💖`
                    ]
                );
            }
        });
    });
}

// ==========================================
// CRIA DESABAFOS INICIAIS
// ==========================================
function criarDesabafosIniciais() {
    const nomesBots = ['Ana_Conselhos', 'Pedro_Amor', 'Maria_S2', 'Joao_Real', 'Carla_Help'];
    const desabafosIniciais = [
        { texto: 'Estou com dúvidas se devo continuar meu relacionamento. Alguém já passou por isso?', sentimento: 'Incerteza', tempo: '1 a 3 anos' },
        { texto: 'Meu parceiro anda muito distante ultimamente. O que fazer?', sentimento: 'Tristeza', tempo: 'Mais de 3 anos' },
        { texto: 'Descobri uma mentira no relacionamento. Como confiar novamente?', sentimento: 'Raiva', tempo: 'Alguns meses' }
    ];

    desabafosIniciais.forEach((d, i) => {
        const botUsuario = `bot_${nomesBots[i % nomesBots.length].toLowerCase()}`;
        db.get(`SELECT nome_exibicao, foto_perfil FROM usuarios WHERE usuario = ?`, [botUsuario], (err, user) => {
            if (user) {
                db.run(
                    `INSERT INTO desabafos (autor, foto_autor, texto, tempo_juntos, sentimento, termometro) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        user.nome_exibicao,
                        user.foto_perfil,
                        d.texto,
                        d.tempo,
                        d.sentimento,
                        ['Gelado ❄️', 'Morno 🟡', 'Quente 🔥'][i % 3]
                    ]
                );
            }
        });
    });
}

// ==========================================
// INICIALIZAÇÃO DO BANCO
// ==========================================
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT UNIQUE,
        senha TEXT,
        nome_exibicao TEXT DEFAULT '',
        bio TEXT DEFAULT 'Em busca de conselhos...',
        status_relacionamento TEXT DEFAULT 'Indefinido',
        tempo_relacionamento TEXT DEFAULT 'Não informado',
        foto_perfil TEXT DEFAULT '',
        is_premium BOOLEAN DEFAULT 0,
        is_online BOOLEAN DEFAULT 0,
        ultima_atividade DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS desabafos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        autor TEXT,
        foto_autor TEXT DEFAULT '',
        texto TEXT,
        texto_original TEXT DEFAULT '',
        tempo_juntos TEXT,
        sentimento TEXT,
        termometro TEXT,
        is_destaque BOOLEAN DEFAULT 0,
        data_publicacao DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS conselhos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        desabafo_id INTEGER,
        usuario TEXT DEFAULT '',
        autor TEXT,
        foto_autor TEXT DEFAULT '',
        texto TEXT,
        is_bot BOOLEAN DEFAULT 0,
        data_publicacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (desabafo_id) REFERENCES desabafos(id)
    )`);
    db.run(`ALTER TABLE conselhos ADD COLUMN usuario TEXT DEFAULT ''`, () => {});

    db.run(`CREATE TABLE IF NOT EXISTS reacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conselho_id INTEGER,
        usuario TEXT,
        reacao TEXT,
        data_reacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conselho_id) REFERENCES conselhos(id),
        UNIQUE(conselho_id, usuario)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS usuarios_online (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT UNIQUE,
        nome_exibicao TEXT,
        foto_perfil TEXT DEFAULT '',
        ultima_atividade DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS seguidores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seguidor TEXT NOT NULL,
        seguido TEXT NOT NULL,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(seguidor, seguido)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notificacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT,
        mensagem TEXT,
        lida BOOLEAN DEFAULT 0,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        desabafo_id INTEGER,
        conselho_id INTEGER
    )`);

    setTimeout(() => {
        criarBots();
        setTimeout(criarDesabafosIniciais, 1000);
    }, 500);

    console.log('✅ Banco de dados configurado com sucesso!');
});

// ==========================================
// ROTA: GET /api/usuario/:email
// ==========================================
app.get('/api/usuario/:email', (req, res) => {
    const email = req.params.email;
    db.get(`SELECT nome_exibicao, foto_perfil FROM usuarios WHERE usuario = ?`, [email], (err, user) => {
        if (err || !user) {
            return res.json({ sucesso: false, erro: 'Usuário não encontrado.' });
        }
        res.json({ 
            sucesso: true, 
            nome_exibicao: user.nome_exibicao || email.split('@')[0],
            foto_perfil: user.foto_perfil || ''
        });
    });
});

// ==========================================
// 1. ROTAS DE AUTENTICAÇÃO
// ==========================================
app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body;
    db.get(`SELECT * FROM usuarios WHERE usuario = ? AND senha = ?`, [usuario, senha], (err, row) => {
        if (row) {
            db.run(`UPDATE usuarios SET is_online = 1, ultima_atividade = CURRENT_TIMESTAMP WHERE usuario = ?`, [usuario]);
            res.json({ sucesso: true, usuario: row.usuario, foto_perfil: row.foto_perfil || '' });
        } else {
            res.status(401).json({ sucesso: false, erro: 'Usuário ou senha incorretos.' });
        }
    });
});

function aplicarIndicacao(indicadoPor, novoUsuario, callback = () => {}) {
    if (!indicadoPor || !novoUsuario || indicadoPor === novoUsuario) return callback();
    db.get(`SELECT 1 FROM usuarios WHERE usuario = ?`, [indicadoPor], (err, indicado) => {
        if (err || !indicado) return callback();
        db.run(`INSERT OR IGNORE INTO seguidores (seguidor, seguido) VALUES (?, ?)`, [novoUsuario, indicadoPor], () => callback());
    });
}

app.post('/api/cadastro', (req, res) => {
    const { usuario, senha, indicado_por } = req.body;
    db.run(`INSERT INTO usuarios (usuario, senha) VALUES (?, ?)`, [usuario, senha], function(err) {
        if (err) return res.status(400).json({ sucesso: false, erro: 'Este usuário já existe.' });
        aplicarIndicacao(indicado_por, usuario, () => res.json({ sucesso: true, usuario, seguindo_indicador: !!indicado_por }));
    });
});

app.post('/api/auth/google', async (req, res) => {
    const { token, indicado_por } = req.body;
    try {
        const ticket = await client.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        const email = payload.email;
        const nome = payload.name;
        const fotoGoogle = payload.picture || '';

        db.get(`SELECT * FROM usuarios WHERE usuario = ?`, [email], (err, row) => {
            if (row) {
                let updateFields = [];
                let updateValues = [];

                if (!row.foto_perfil || row.foto_perfil === '') {
                    updateFields.push('foto_perfil = ?');
                    updateValues.push(fotoGoogle);
                }
                if (!row.nome_exibicao || row.nome_exibicao === '') {
                    updateFields.push('nome_exibicao = ?');
                    updateValues.push(nome);
                }

                updateFields.push('is_online = 1');
                updateFields.push('ultima_atividade = CURRENT_TIMESTAMP');
                updateValues.push(email);

                if (updateFields.length > 0) {
                    const query = `UPDATE usuarios SET ${updateFields.join(', ')} WHERE usuario = ?`;
                    db.run(query, updateValues, function(err2) {
                        if (err2) console.error('Erro ao atualizar:', err2);
                    });
                }

                db.get(`SELECT * FROM usuarios WHERE usuario = ?`, [email], (err3, usuarioAtualizado) => {
                    res.json({
                        sucesso: true,
                        usuario: email,
                        foto_perfil: usuarioAtualizado?.foto_perfil || fotoGoogle,
                        nome_exibicao: usuarioAtualizado?.nome_exibicao || nome
                    });
                });
            } else {
                db.run(
                    `INSERT INTO usuarios (usuario, senha, foto_perfil, nome_exibicao, is_online) VALUES (?, ?, ?, ?, 1)`,
                    [email, 'GOOGLE_AUTH_USER', fotoGoogle, nome],
                    function(err2) {
                        if (err2) {
                            console.error('Erro ao cadastrar:', err2);
                            return res.status(500).json({ sucesso: false, erro: 'Erro ao cadastrar.' });
                        }
                        aplicarIndicacao(indicado_por, email, () => res.json({
                            sucesso: true,
                            usuario: email,
                            foto_perfil: fotoGoogle,
                            nome_exibicao: nome
                        }));
                    }
                );
            }
        });
    } catch (error) {
        console.error('Erro no Google Auth:', error);
        return res.status(401).json({ sucesso: false, erro: 'Falha na autenticação com o Google.' });
    }
});

app.post('/api/logout', (req, res) => {
    const { usuario } = req.body;
    db.run(`UPDATE usuarios SET is_online = 0 WHERE usuario = ?`, [usuario]);
    res.json({ sucesso: true });
});

// ==========================================
// 2. ROTAS DE USUÁRIOS ONLINE
// ==========================================
app.get('/api/usuarios-online', (req, res) => {
    db.all(`
        SELECT usuario, nome_exibicao, foto_perfil, ultima_atividade 
        FROM usuarios 
        WHERE is_online = 1 
        ORDER BY ultima_atividade DESC 
        LIMIT 100
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        res.json({ sucesso: true, online: rows, total: rows.length });
    });
});

// ==========================================
// 3. ROTAS DE NOTIFICAÇÕES
// ==========================================
app.get('/api/notificacoes/:usuario', (req, res) => {
    const usuario = req.params.usuario;
    db.all(`
        SELECT * FROM notificacoes 
        WHERE usuario = ? 
        ORDER BY data_criacao DESC 
        LIMIT 50
    `, [usuario], (err, rows) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        res.json({ sucesso: true, notificacoes: rows });
    });
});

app.put('/api/notificacoes/ler/:id', (req, res) => {
    const id = req.params.id;
    db.run(`UPDATE notificacoes SET lida = 1 WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        res.json({ sucesso: true });
    });
});

app.put('/api/notificacoes/ler-todas/:usuario', (req, res) => {
    const usuario = req.params.usuario;
    db.run(`UPDATE notificacoes SET lida = 1 WHERE usuario = ?`, [usuario], function(err) {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        res.json({ sucesso: true });
    });
});

// ==========================================
// 4. ROTAS DE PERFIL
// ==========================================
app.get('/api/perfil/:email', (req, res) => {
    const email = req.params.email;
    const visitante = req.query.visualizador || '';
    db.get(`SELECT usuario, nome_exibicao, bio, status_relacionamento, tempo_relacionamento, foto_perfil, is_premium FROM usuarios WHERE usuario = ? OR nome_exibicao = ? LIMIT 1`, [email, email], (err, user) => {
        if (err || !user) return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado.' });
        const identidade = user.usuario;
        
        db.get(`SELECT COUNT(*) as total FROM conselhos WHERE usuario = ? OR autor = ?`, [identidade, identidade], (err, conselhos) => {
            db.get(`SELECT COUNT(*) as total FROM seguidores WHERE seguido = ?`, [identidade], (err, seguidores) => {
                db.get(`SELECT COUNT(*) as total FROM seguidores WHERE seguidor = ?`, [identidade], (err, seguindo) => {
                    const consultarSeguindo = visitante && visitante !== identidade
                        ? new Promise(resolve => db.get(`SELECT 1 FROM seguidores WHERE seguidor = ? AND seguido = ?`, [visitante, identidade], (e, row) => resolve(!!row)))
                        : Promise.resolve(false);
                    consultarSeguindo.then(isSeguindo => res.json({
                sucesso: true, 
                usuario: identidade,
                nome_exibicao: user.nome_exibicao || identidade.split('@')[0],
                bio: user.bio || 'Em busca de conselhos...',
                status_relacionamento: user.status_relacionamento || 'Indefinido',
                tempo_relacionamento: user.tempo_relacionamento || 'Não informado',
                foto_perfil: user.foto_perfil || '',
                is_premium: user.is_premium || false,
                total_conselhos: conselhos ? conselhos.total : 0,
                total_seguidores: seguidores ? seguidores.total : 0,
                total_seguindo: seguindo ? seguindo.total : 0,
                is_seguindo: isSeguindo
                    }));
                });
            });
        });
    });
});

app.get('/api/seguir/status', (req, res) => {
    const { seguidor, seguido } = req.query;
    if (!seguidor || !seguido) return res.status(400).json({ sucesso: false, erro: 'Usuários não informados.' });
    db.get(`SELECT usuario FROM usuarios WHERE usuario = ? OR nome_exibicao = ? LIMIT 1`, [seguido, seguido], (err, alvo) => {
        const identidade = alvo?.usuario || seguido;
        db.get(`SELECT 1 FROM seguidores WHERE seguidor = ? AND seguido = ?`, [seguidor, identidade], (err, row) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        res.json({ sucesso: true, seguindo: !!row });
        });
    });
});

app.post('/api/seguir', (req, res) => {
    const { seguidor, seguido } = req.body || {};
    if (!seguidor || !seguido) return res.status(400).json({ sucesso: false, erro: 'Usuários não informados.' });
    if (seguidor === seguido) return res.status(400).json({ sucesso: false, erro: 'Você não pode seguir a si mesmo.' });
    db.get(`SELECT usuario FROM usuarios WHERE usuario = ? OR nome_exibicao = ? LIMIT 1`, [seguido, seguido], (err, alvo) => {
        if (err || !alvo) return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado.' });
        const identidadeSeguida = alvo.usuario;
        if (seguidor === identidadeSeguida) return res.status(400).json({ sucesso: false, erro: 'Você não pode seguir a si mesmo.' });
        db.get(`SELECT 1 FROM seguidores WHERE seguidor = ? AND seguido = ?`, [seguidor, identidadeSeguida], (checkErr, row) => {
            if (checkErr) return res.status(500).json({ sucesso: false, erro: checkErr.message });
            const finalizar = (seguindo) => db.get(`SELECT COUNT(*) as total FROM seguidores WHERE seguido = ?`, [identidadeSeguida], (e1, seguidores) => db.get(`SELECT COUNT(*) as total FROM seguidores WHERE seguidor = ?`, [seguidor], (e2, seguindoTotal) => res.json({ sucesso: true, seguindo, usuario: identidadeSeguida, total_seguidores: seguidores?.total || 0, total_seguindo: seguindoTotal?.total || 0 })));
            if (row) return db.run(`DELETE FROM seguidores WHERE seguidor = ? AND seguido = ?`, [seguidor, identidadeSeguida], e => e ? res.status(500).json({ sucesso: false, erro: e.message }) : finalizar(false));
            db.run(`INSERT INTO seguidores (seguidor, seguido) VALUES (?, ?)`, [seguidor, identidadeSeguida], e => e ? res.status(500).json({ sucesso: false, erro: e.message }) : finalizar(true));
        });
    });
});

app.put('/api/perfil', (req, res) => {
    const { usuario, nome_exibicao, bio, status_relacionamento, tempo_relacionamento, novaSenha, foto_perfil } = req.body;

    if (novaSenha && novaSenha.trim() !== '') {
        db.run(`UPDATE usuarios SET nome_exibicao = ?, bio = ?, status_relacionamento = ?, tempo_relacionamento = ?, senha = ?, foto_perfil = ? WHERE usuario = ?`, 
        [nome_exibicao, bio, status_relacionamento, tempo_relacionamento, novaSenha, foto_perfil, usuario], function(err) {
            if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar.' });
            res.json({ sucesso: true });
        });
    } else {
        db.run(`UPDATE usuarios SET nome_exibicao = ?, bio = ?, status_relacionamento = ?, tempo_relacionamento = ?, foto_perfil = ? WHERE usuario = ?`, 
        [nome_exibicao, bio, status_relacionamento, tempo_relacionamento, foto_perfil, usuario], function(err) {
            if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar.' });
            res.json({ sucesso: true });
        });
    }
});

// ==========================================
// 5. ROTAS DO FEED E DESABAFOS
// ==========================================
app.get('/api/desabafos', (req, res) => {
    const query = `
        SELECT d.*, 
        (SELECT COUNT(*) FROM conselhos c WHERE c.desabafo_id = d.id) as comentarios,
        (SELECT autor FROM conselhos WHERE desabafo_id = d.id ORDER BY id DESC LIMIT 1) as ultimo_autor,
        (SELECT texto FROM conselhos WHERE desabafo_id = d.id ORDER BY id DESC LIMIT 1) as ultimo_texto
        FROM desabafos d
        ORDER BY
          CASE WHEN
            NOT EXISTS (
              SELECT 1 FROM usuarios u
              WHERE (u.usuario LIKE 'bot_%' AND (u.usuario = d.autor OR u.nome_exibicao = d.autor))
            )
            AND NOT EXISTS (
              SELECT 1 FROM conselhos ch
              WHERE ch.desabafo_id = d.id AND COALESCE(ch.is_bot, 0) = 0
            )
          THEN 0 ELSE 1 END,
          CASE WHEN NOT EXISTS (
            SELECT 1 FROM usuarios u
            WHERE (u.usuario LIKE 'bot_%' AND (u.usuario = d.autor OR u.nome_exibicao = d.autor))
          ) THEN 0 ELSE 1 END,
          d.is_destaque DESC,
          d.id DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        res.json({ sucesso: true, desabafos: rows });
    });
});

app.post('/api/desabafos', async (req, res) => {
    const { autor, texto, tempo_juntos, sentimento, anonimo } = req.body;
    if (!texto) return res.status(400).json({ sucesso: false, erro: 'O texto é obrigatório.' });

    const textoFiltrado = filtrarPalavroes(texto);
    const temPalavrao = detectarPalavroes(texto);

    let termometro = 'Morno 🟡';
    await esperarIA();
    if (iaInicializada && MODELO_ATIVO) {
        try {
            const promptIA = `Analise o seguinte desabafo de relacionamento. Baseado na gravidade e emoção, classifique em EXATAMENTE UMA destas opções: "Gelado ❄️" (distanciamento, frieza), "Morno 🟡" (dúvidas cotidianas, ciúmes leve), "Quente 🔥" (traição, brigas intensas, toxicidade). Retorne APENAS a string da classificação. Desabafo: "${texto}"`;
            const respostaIA = await gerarComIA(promptIA);
            if (respostaIA && (respostaIA.includes('Gelado') || respostaIA.includes('Morno') || respostaIA.includes('Quente'))) {
                termometro = respostaIA;
                console.log(`🌡️ Termômetro: ${termometro}`);
            }
        } catch (error) {
            console.error("Erro na IA (termômetro):", error.message);
        }
    }

    db.get(`SELECT nome_exibicao, foto_perfil FROM usuarios WHERE usuario = ?`, [autor], (err, user) => {
        let nomeExibicao = autor.split('@')[0];
        let fotoPerfil = '';

        if (user) {
            if (user.nome_exibicao && user.nome_exibicao.trim() !== '') {
                nomeExibicao = user.nome_exibicao;
            }
            if (!anonimo) {
                fotoPerfil = user.foto_perfil || '';
            }
        }

        const autorEmail = autor;
        const autorExibicao = anonimo ? `Anônimo (${autor.split('@')[0].substring(0,4)}...)` : nomeExibicao;

        const query = `INSERT INTO desabafos (autor, foto_autor, texto, texto_original, tempo_juntos, sentimento, termometro, is_destaque) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`;
        db.run(query, [autorEmail, fotoPerfil, textoFiltrado, temPalavrao ? texto : '', tempo_juntos || 'Não informado', sentimento || 'Confuso', termometro], function(err) {
            if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao salvar.' });
            
            const idDesabafo = this.lastID;
            
            if (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY) {
                db.get(`SELECT usuario, nome_exibicao, foto_perfil FROM usuarios WHERE usuario LIKE 'bot_%' ORDER BY RANDOM() LIMIT 1`, [], (err, bot) => {
                    if (bot) {
                        agendarRespostaIA(idDesabafo, texto, bot.nome_exibicao, bot);
                    }
                });
            }
            
            res.json({ 
                sucesso: true, 
                id: idDesabafo, 
                termometro, 
                aviso: temPalavrao ? '⚠️ Seu texto continha palavras ofensivas que foram filtradas.' : '' 
            });
        });
    });
});

// ==========================================
// PRESENÇA DE DIGITAÇÃO
// ==========================================
const pessoasDigitando = new Map();
function atualizarDigitando(desabafoId, usuario, nome, ativo) {
    const chave = `${desabafoId}:${usuario}`;
    if (ativo) pessoasDigitando.set(chave, { desabafoId: String(desabafoId), usuario, nome, expira: Date.now() + 6000 });
    else pessoasDigitando.delete(chave);
}
function limparDigitacaoExpirada() {
    const agora = Date.now();
    for (const [chave, item] of pessoasDigitando) if (item.expira < agora) pessoasDigitando.delete(chave);
}
setInterval(limparDigitacaoExpirada, 2000);

app.post('/api/conselhos/digitando', (req, res) => {
    const { desabafo_id, usuario, nome, digitando } = req.body;
    if (!desabafo_id || !usuario) return res.status(400).json({ sucesso: false });
    atualizarDigitando(desabafo_id, usuario, nome || 'Alguém da comunidade', Boolean(digitando));
    res.json({ sucesso: true });
});

app.get('/api/conselhos/digitando/:id', (req, res) => {
    limparDigitacaoExpirada();
    const atual = [...pessoasDigitando.values()].filter(item => item.desabafoId === String(req.params.id) && item.usuario !== req.query.usuario);
    res.json({ sucesso: true, digitando: atual.map(item => item.nome) });
});

// ==========================================
// 6. ROTAS DE CONSELHOS
// ==========================================
app.get('/api/conselhos/:id', (req, res) => {
    const desabafoId = req.params.id;
    db.all(`
        SELECT c.*, 
        (SELECT COUNT(*) FROM reacoes WHERE conselho_id = c.id) as total_reacoes,
        (SELECT GROUP_CONCAT(reacao || ':' || usuario) FROM reacoes WHERE conselho_id = c.id) as reacoes_detalhes,
        (CASE 
            WHEN c.autor LIKE 'bot_%' OR c.is_bot = 1 THEN 0 
            ELSE 1 
        END) as is_real
        FROM conselhos c 
        WHERE c.desabafo_id = ? 
        ORDER BY c.id ASC
    `, [desabafoId], (err, rows) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        
        const conselhosComReacoes = rows.map(row => {
            const reacoes = {};
            if (row.reacoes_detalhes) {
                row.reacoes_detalhes.split(',').forEach(item => {
                    const [reacao, usuario] = item.split(':');
                    if (!reacoes[reacao]) reacoes[reacao] = [];
                    reacoes[reacao].push(usuario);
                });
            }
            return { ...row, reacoes };
        });
        
        res.json({ sucesso: true, conselhos: conselhosComReacoes });
    });
});

app.post('/api/conselhos', async (req, res) => {
    const { desabafo_id, autor, texto, anonimo } = req.body;
    
    if (!texto || !texto.trim()) return res.status(400).json({ sucesso: false, erro: 'O texto do conselho é obrigatório.' });

    const textoFiltrado = filtrarPalavroes(texto);
    const temPalavrao = detectarPalavroes(texto);
    const isBot = autor.toLowerCase().startsWith('bot_') || autor.toLowerCase().includes('bot_');

    db.get(`SELECT usuario, is_premium, nome_exibicao, foto_perfil FROM usuarios WHERE usuario = ?`, [autor], (err, user) => {
        if (err || !user) {
            db.get(`SELECT usuario, is_premium, nome_exibicao, foto_perfil FROM usuarios WHERE nome_exibicao = ?`, [autor], (err2, user2) => {
                if (err2 || !user2) {
                    return res.status(400).json({ sucesso: false, erro: 'Usuário não encontrado.' });
                }
                processarConselho(user2);
            });
            return;
        }
        processarConselho(user);
    });

    function processarConselho(user) {
        let nomeExibicao = user.nome_exibicao && user.nome_exibicao.trim() !== '' ? user.nome_exibicao : autor.split('@')[0];
        let fotoPerfil = !anonimo ? (user.foto_perfil || '') : '';

        if (anonimo) {
            nomeExibicao = `Anônimo (${nomeExibicao.substring(0,4)}...)`;
        }

        if (!isBot && user.is_premium === 0) {
            const queryCount = `SELECT COUNT(*) as total FROM conselhos WHERE autor = ? AND strftime('%Y-%m', data_publicacao) = strftime('%Y-%m', 'now')`;
            db.get(queryCount, [autor], (err, contagem) => {
                if (contagem && contagem.total >= 5) {
                    return res.status(403).json({ 
                        sucesso: false, 
                        limite_atingido: true, 
                        erro: 'Você atingiu o limite de 5 conselhos gratuitos neste mês. Assine o VIP!' 
                    });
                }
                salvarConselho();
            });
        } else {
            salvarConselho();
        }

        function salvarConselho() {
            db.run(`INSERT INTO conselhos (desabafo_id, usuario, autor, foto_autor, texto, is_bot) VALUES (?, ?, ?, ?, ?, ?)`, 
            [desabafo_id, anonimo ? '' : user.usuario, nomeExibicao, fotoPerfil, textoFiltrado, isBot ? 1 : 0], function(err) {
                if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao salvar conselho.' });
                
                const conselhoId = this.lastID;
                
                // NOTIFICA TODOS OS PARTICIPANTES
                notificarTodosParticipantes(desabafo_id, nomeExibicao, textoFiltrado, isBot);
                res.json({ 
                    sucesso: true, 
                    mensagem: 'Mensagem enviada!', 
                    aviso: temPalavrao ? '⚠️ Seu texto continha palavras ofensivas que foram filtradas.' : '' 
                });
            });
        }
    }
});

// ==========================================
// 7. ROTAS DE REAÇÕES
// ==========================================
app.post('/api/reacoes', (req, res) => {
    const { conselho_id, usuario, reacao } = req.body;
    
    const reacoesPermitidas = ['❤️', '👍', '😂', '😮', '😢', '🙏', '💡', '🔥'];
    if (!reacoesPermitidas.includes(reacao)) {
        return res.status(400).json({ sucesso: false, erro: 'Reação inválida.' });
    }

    db.get(`SELECT * FROM reacoes WHERE conselho_id = ? AND usuario = ?`, [conselho_id, usuario], (err, row) => {
        if (row) {
            db.run(
                `UPDATE reacoes SET reacao = ?, data_reacao = CURRENT_TIMESTAMP WHERE conselho_id = ? AND usuario = ?`,
                [reacao, conselho_id, usuario],
                function(err) {
                    if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar reação.' });
                    res.json({ sucesso: true, mensagem: 'Reação atualizada!' });
                }
            );
        } else {
            db.run(
                `INSERT INTO reacoes (conselho_id, usuario, reacao) VALUES (?, ?, ?)`,
                [conselho_id, usuario, reacao],
                function(err) {
                    if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao salvar reação.' });
                    res.json({ sucesso: true, mensagem: 'Reação adicionada!' });
                }
            );
        }
    });
});

app.get('/api/reacoes/:conselho_id', (req, res) => {
    const conselhoId = req.params.conselho_id;
    db.all(`
        SELECT reacao, COUNT(*) as total, GROUP_CONCAT(usuario) as usuarios
        FROM reacoes 
        WHERE conselho_id = ?
        GROUP BY reacao
    `, [conselhoId], (err, rows) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        const reacoes = {};
        rows.forEach(row => {
            reacoes[row.reacao] = {
                total: row.total,
                usuarios: row.usuarios ? row.usuarios.split(',') : []
            };
        });
        res.json({ sucesso: true, reacoes });
    });
});

// ==========================================
// 8. ROTA PARA SIMULAR USUÁRIOS ONLINE
// ==========================================
app.post('/api/simular-online', (req, res) => {
    db.all(`SELECT usuario FROM usuarios WHERE usuario LIKE 'bot_%'`, [], (err, bots) => {
        if (err || !bots) return res.json({ sucesso: false });
        
        const onlineCount = Math.floor(Math.random() * 6) + 2;
        const shuffled = bots.sort(() => 0.5 - Math.random());
        const onlineBots = shuffled.slice(0, onlineCount);
        
        db.run(`UPDATE usuarios SET is_online = 0 WHERE usuario LIKE 'bot_%'`);
        
        const placeholders = onlineBots.map(() => '?').join(',');
        const usuarios = onlineBots.map(b => b.usuario);
        db.run(`UPDATE usuarios SET is_online = 1, ultima_atividade = CURRENT_TIMESTAMP WHERE usuario IN (${placeholders})`, usuarios);
        
        db.run(`DELETE FROM usuarios_online`);
        onlineBots.forEach(bot => {
            db.get(`SELECT nome_exibicao, foto_perfil FROM usuarios WHERE usuario = ?`, [bot.usuario], (err, user) => {
                if (user) {
                    db.run(
                        `INSERT INTO usuarios_online (usuario, nome_exibicao, foto_perfil, ultima_atividade) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                        [bot.usuario, user.nome_exibicao, user.foto_perfil]
                    );
                }
            });
        });
        
        res.json({ sucesso: true, online: onlineCount });
    });
});

// ==========================================
// 9. ROTA DE RANKING
// ==========================================
app.get('/api/ranking', (req, res) => {
    db.all(`
        SELECT u.usuario, u.nome_exibicao, u.foto_perfil, 
               COUNT(c.id) as conselhos,
               COALESCE(AVG(CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END), 0) as media_reacoes
        FROM usuarios u
        LEFT JOIN conselhos c ON c.autor = u.nome_exibicao OR c.autor = u.usuario
        LEFT JOIN reacoes r ON r.conselho_id = c.id
        WHERE u.usuario NOT LIKE 'bot_%'
        GROUP BY u.id
        ORDER BY conselhos DESC, media_reacoes DESC
        LIMIT 20
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        
        const ranking = rows.map((row, index) => ({
            id: index + 1,
            nome: row.nome_exibicao || row.usuario.split('@')[0],
            foto: row.foto_perfil || '',
            estrelas: (row.media_reacoes * 5).toFixed(1),
            conselhos: row.conselhos || 0,
            nivel: row.conselhos >= 50 ? 'Guru dos Relacionamentos ⭐' :
                   row.conselhos >= 20 ? 'Mestre do Amor 💖' :
                   row.conselhos >= 5 ? 'Conselheiro 🤝' : 'Aprendiz 🌱'
        }));
        
        res.json({ sucesso: true, ranking });
    });
});

// ==========================================
// 10. PAGAMENTOS MERCADO PAGO
// ==========================================
app.post('/api/pagamentos/preferencia', async (req, res) => {
    const { plano, usuario } = req.body || {};
    const configuracao = PLANOS_PAGAMENTO[plano];

    if (!configuracao) {
        return res.status(400).json({ sucesso: false, erro: 'Plano inválido.' });
    }
    if (!MP_ACCESS_TOKEN) {
        return res.status(503).json({ sucesso: false, erro: 'Pagamento ainda não configurado no servidor.' });
    }

    try {
        const referencia = `${plano}:${usuario || 'anonimo'}:${Date.now()}`;
        const preferencia = {
            items: [{
                id: plano.toLowerCase(),
                title: configuracao.titulo,
                quantity: 1,
                currency_id: 'BRL',
                unit_price: configuracao.valor
            }],
            external_reference: referencia,
            back_urls: {
                success: `${APP_URL}/?pagamento=sucesso`,
                failure: `${APP_URL}/?pagamento=falhou`,
                pending: `${APP_URL}/?pagamento=pendente`
            },
            auto_return: 'approved',
            notification_url: MP_NOTIFICATION_URL
        };

        if (usuario && usuario.includes('@')) preferencia.payer = { email: usuario };

        const dados = await mercadoPagoRequest('/checkout/preferences', {
            method: 'POST',
            body: JSON.stringify(preferencia)
        });

        res.json({
            sucesso: true,
            preferencia_id: dados.id,
            url: dados.init_point,
            url_teste: dados.sandbox_init_point || dados.init_point
        });
    } catch (error) {
        console.error('Erro ao criar preferência do Mercado Pago:', error.message);
        res.status(502).json({ sucesso: false, erro: 'Não foi possível iniciar o pagamento.' });
    }
});

app.post('/api/pagamentos/pix', async (req, res) => {
    const { plano, usuario } = req.body || {};
    const configuracao = PLANOS_PAGAMENTO[plano];

    if (!configuracao) return res.status(400).json({ sucesso: false, erro: 'Plano inválido.' });
    if (!MP_ACCESS_TOKEN) return res.status(503).json({ sucesso: false, erro: 'MERCADOPAGO_ACCESS_TOKEN não configurado no servidor.' });
    if (!usuario || !/^\S+@\S+\.\S+$/.test(usuario)) {
        return res.status(400).json({ sucesso: false, erro: 'É necessário ter um e-mail válido para gerar o Pix.' });
    }

    try {
        const idempotencyKey = `pix-${plano.toLowerCase()}-${usuario}-${Date.now()}`;
        const dados = await mercadoPagoRequest('/v1/payments', {
            method: 'POST',
            headers: { 'X-Idempotency-Key': idempotencyKey },
            body: JSON.stringify({
                transaction_amount: configuracao.valor,
                description: configuracao.titulo,
                payment_method_id: 'pix',
                external_reference: `${plano}:${usuario}:${Date.now()}`,
                payer: { email: usuario }
            })
        });
        const transacao = dados.point_of_interaction?.transaction_data || {};
        res.json({
            sucesso: true,
            pagamento_id: dados.id,
            status: dados.status,
            qr_code: transacao.qr_code || '',
            qr_code_base64: transacao.qr_code_base64 || '',
            ticket_url: transacao.ticket_url || ''
        });
    } catch (error) {
        console.error('Erro ao criar Pix no Mercado Pago:', error.message);
        res.status(502).json({ sucesso: false, erro: 'Não foi possível gerar o Pix. Verifique as credenciais e o e-mail da conta.' });
    }
});

app.post('/api/pagamentos/webhook', async (req, res) => {
    console.log('Notificação Mercado Pago recebida:', JSON.stringify(req.body || req.query));
    res.sendStatus(200);
});

// ==========================================
// 11. TIMER PARA SIMULAR ATIVIDADE
// ==========================================
setInterval(() => {
    fetch('http://localhost:3000/api/simular-online', { method: 'POST' }).catch(() => {});
    
    if (Math.random() > 0.8) {
        db.get(`SELECT usuario, nome_exibicao, foto_perfil FROM usuarios WHERE usuario LIKE 'bot_%' ORDER BY RANDOM() LIMIT 1`, [], (err, bot) => {
            if (bot) {
                const frases = [
                    'Estou confuso sobre o que sinto. Alguém pode me ajudar?',
                    'Meu parceiro disse algo que me magoou. Como lidar com isso?',
                    'Acho que estou perdendo o amor por ele(a). O que fazer?',
                    'Sinto que não sou prioridade no relacionamento.',
                    'Descobri uma mentira e não sei como reagir.',
                    'O que fazer quando a confiança acaba?'
                ];
                const frase = frases[Math.floor(Math.random() * frases.length)];
                const sentimentos = ['Tristeza', 'Raiva', 'Incerteza', 'Medo', 'Ciúmes', 'Frustração'];
                const tempos = ['Menos de 1 mês', 'Alguns meses', '1 a 3 anos', 'Mais de 3 anos', 'Casados'];
                const termometros = ['Gelado ❄️', 'Morno 🟡', 'Quente 🔥'];
                
                db.run(
                    `INSERT INTO desabafos (autor, foto_autor, texto, tempo_juntos, sentimento, termometro) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        bot.nome_exibicao,
                        bot.foto_perfil || '',
                        frase,
                        tempos[Math.floor(Math.random() * tempos.length)],
                        sentimentos[Math.floor(Math.random() * sentimentos.length)],
                        termometros[Math.floor(Math.random() * termometros.length)]
                    ]
                );
            }
        });
    }
}, 15000);

// ==========================================
// INICIA O SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`💖 [DESABAFA CORAÇÃO] Servidor rodando na porta ${PORT}`);
    console.log(`📊 Bots criados: 10 usuários simulados`);
    console.log(`🔄 Atualização de online a cada 10 segundos`);
    console.log(`🤖 IA: ${iaInicializada ? `ATIVA via ${PROVEDOR_IA} (${MODELO_ATIVO})` : 'inicializando...'}`);
    console.log(`⏳ IA responde após 2-5 minutos se ninguém responder`);
    console.log(`🔒 Filtro de palavras ofensivas ativo`);
    console.log(`📱 Reações disponíveis: ❤️ 👍 😂 😮 😢 🙏 💡 🔥`);
    console.log(`🔔 Notificações ativas para todos os participantes`);
    console.log(`💬 Conversa em tempo real com IA`);
});
