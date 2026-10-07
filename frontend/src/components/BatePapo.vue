<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({ usuarioLogado: String, usuarioInicial: String })
const emit = defineEmits(['fechar', 'toast'])
const recebidas = ref([])
const enviadas = ref([])
const conversas = ref([])
const conversaAtual = ref(null)
const mensagens = ref([])
const texto = ref('')
const carregando = ref(true)
const enviando = ref(false)
let intervalo = null

const carregar = async () => {
  try {
    const [r1, r2] = await Promise.all([
      fetch(`https://meusocial-api.onrender.com/api/chat/solicitacoes/${encodeURIComponent(props.usuarioLogado)}`),
      fetch(`https://meusocial-api.onrender.com/api/chat/conversas/${encodeURIComponent(props.usuarioLogado)}`)
    ])
    const convites = await r1.json(); const chats = await r2.json()
    if (convites.sucesso) { recebidas.value = convites.recebidas || []; enviadas.value = convites.enviadas || [] }
    if (chats.sucesso) conversas.value = chats.conversas || []
    if (conversaAtual.value) await abrirConversa(conversaAtual.value)
  } catch (e) { emit('toast', 'Não foi possível carregar os bate-papos.', 'error') }
  finally { carregando.value = false }
}

const responder = async (convite, acao) => {
  try {
    const res = await fetch(`https://meusocial-api.onrender.com/api/chat/solicitacoes/${convite.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: props.usuarioLogado, acao }) })
    const data = await res.json()
    if (!res.ok || !data.sucesso) throw new Error(data.erro)
    emit('toast', acao === 'aceitar' ? 'Convite aceito! Agora vocês podem conversar.' : 'Convite recusado.', acao === 'aceitar' ? 'success' : 'info')
    await carregar()
  } catch (e) { emit('toast', e.message || 'Erro ao responder convite.', 'error') }
}

const abrirConversa = async (conversa) => {
  conversaAtual.value = conversa
  try {
    const res = await fetch(`https://meusocial-api.onrender.com/api/chat/mensagens/${conversa.id}?usuario=${encodeURIComponent(props.usuarioLogado)}`)
    const data = await res.json(); if (data.sucesso) mensagens.value = data.mensagens || []
  } catch (e) {}
}

const enviar = async () => {
  if (!texto.value.trim() || !conversaAtual.value || enviando.value) return
  enviando.value = true
  try {
    const res = await fetch('https://meusocial-api.onrender.com/api/chat/mensagens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ solicitacao_id: conversaAtual.value.id, autor: props.usuarioLogado, texto: texto.value }) })
    const data = await res.json(); if (!res.ok || !data.sucesso) throw new Error(data.erro)
    texto.value = ''; await abrirConversa(conversaAtual.value)
  } catch (e) { emit('toast', e.message || 'Não foi possível enviar.', 'error') }
  finally { enviando.value = false }
}

const nomeConvite = c => c.nome_solicitante || c.nome_destinatario || 'Pessoa'
const data = d => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
onMounted(() => { carregar(); intervalo = setInterval(carregar, 7000) })
onUnmounted(() => clearInterval(intervalo))
</script>

<template>
  <div class="fixed inset-0 z-[90] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" @click.self="emit('fechar')">
    <div class="bg-white rounded-3xl w-full max-w-2xl h-[min(720px,90vh)] shadow-2xl overflow-hidden flex flex-col">
      <header class="px-5 py-4 border-b border-[#efefef] flex items-center justify-between"><div><h2 class="text-xl font-black text-[#1A1A2E]">💬 Bate-papo</h2><p class="text-xs text-[#8e8e8e]">Converse individualmente após o aceite</p></div><button @click="emit('fechar')" class="text-2xl text-[#8e8e8e]">×</button></header>
      <div v-if="carregando" class="flex-1 grid place-items-center text-[#8e8e8e]">Carregando...</div>
      <div v-else class="flex-1 overflow-hidden flex flex-col sm:flex-row">
        <aside class="sm:w-2/5 border-b sm:border-b-0 sm:border-r border-[#efefef] overflow-y-auto p-3">
          <h3 v-if="recebidas.length" class="text-xs font-bold uppercase tracking-wider text-[#d94678] mb-2">Convites recebidos</h3>
          <div v-for="c in recebidas" :key="c.id" class="p-3 rounded-xl bg-[#fff5f8] mb-2"><p class="font-bold text-sm text-[#1A1A2E]">{{ nomeConvite(c) }}</p><p class="text-xs text-[#8e8e8e] mt-0.5">quer conversar com você</p><p class="text-[10px] text-[#8e8e8e] mt-1">{{ data(c.data_criacao) }}</p><div class="flex gap-2 mt-2"><button @click="responder(c, 'aceitar')" class="flex-1 rounded-lg bg-green-500 text-white text-xs font-bold py-2">Aceitar</button><button @click="responder(c, 'recusar')" class="flex-1 rounded-lg bg-[#f1f1f1] text-[#666] text-xs font-bold py-2">Recusar</button></div></div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-[#6C63FF] mt-4 mb-2">Conversas</h3>
          <button v-for="c in conversas" :key="c.id" @click="abrirConversa(c)" :class="['w-full text-left p-3 rounded-xl mb-1 transition-colors', conversaAtual?.id === c.id ? 'bg-[#f0edff]' : 'hover:bg-[#f8f9fa]']"><p class="font-bold text-sm text-[#1A1A2E]">{{ c.nome_outro || c.outro_usuario }}</p><p class="text-xs text-[#8e8e8e] truncate">{{ c.ultima_mensagem || 'Comece a conversa' }}</p></button>
          <p v-if="!conversas.length && !recebidas.length" class="text-xs text-[#8e8e8e] text-center py-6">Nenhum convite ou conversa ainda.</p>
        </aside>
        <main class="flex-1 flex flex-col min-h-0">
          <div v-if="!conversaAtual" class="flex-1 grid place-items-center text-center px-8 text-[#8e8e8e]"><div><div class="text-4xl mb-3">💜</div><p class="font-bold text-[#1A1A2E]">Escolha uma conversa</p><p class="text-sm mt-1">Os convites aparecerão aqui para você aceitar ou recusar.</p></div></div>
          <template v-else><div class="px-4 py-3 border-b border-[#efefef]"><p class="font-bold text-[#1A1A2E]">{{ conversaAtual.nome_outro || conversaAtual.outro_usuario }}</p><p class="text-xs text-[#8e8e8e]">{{ conversaAtual.cidade_outro ? '📍 ' + conversaAtual.cidade_outro : 'Conversa privada' }}</p></div><div class="flex-1 overflow-y-auto p-4 space-y-2 bg-[#fcfbff]"><div v-for="m in mensagens" :key="m.id" :class="['max-w-[85%] rounded-2xl px-3 py-2 text-sm', m.autor === usuarioLogado ? 'ml-auto bg-[#6C63FF] text-white rounded-br-sm' : 'bg-white border border-[#efefef] text-[#1A1A2E] rounded-bl-sm']"><p>{{ m.texto }}</p><small class="block text-[9px] opacity-60 mt-1">{{ data(m.data_criacao) }}</small></div><p v-if="!mensagens.length" class="text-center text-xs text-[#8e8e8e] py-8">Diga oi e comece uma conversa acolhedora.</p></div><form @submit.prevent="enviar" class="p-3 border-t border-[#efefef] flex gap-2"><input v-model="texto" placeholder="Escreva uma mensagem..." class="flex-1 bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#6C63FF]" /><button :disabled="enviando || !texto.trim()" class="px-4 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#FF6B9D] text-white font-bold text-sm disabled:opacity-50">Enviar</button></form></template>
        </main>
      </div>
    </div>
  </div>
</template>
