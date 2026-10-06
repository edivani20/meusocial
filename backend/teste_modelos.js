// teste_modelos.js
require('dotenv').config();

async function listarModelos() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'AIzaSyDummyKey') {
        console.log('❌ API Key não configurada ou inválida!');
        console.log('   Coloque sua chave no arquivo .env');
        return;
    }

    try {
        // Lista os modelos disponíveis via API REST
        const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('📋 MODELOS DISPONÍVEIS:');
        console.log('====================================');
        
        if (data.models) {
            const modelos = data.models
                .filter(m => m.name.includes('gemini'))
                .map(m => m.name.replace('models/', ''));
            
            if (modelos.length === 0) {
                console.log('⚠️ Nenhum modelo Gemini encontrado!');
                console.log('Modelos disponíveis:', data.models.map(m => m.name));
            } else {
                modelos.forEach((modelo, index) => {
                    console.log(`  ${index + 1}. ${modelo}`);
                });
            }
        } else {
            console.log('❌ Erro ao listar modelos:', data.error?.message || 'Erro desconhecido');
        }
        
        console.log('====================================');
    } catch (error) {
        console.error('❌ Erro na requisição:', error.message);
    }
}

listarModelos();