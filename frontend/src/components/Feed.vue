<script setup>
import { ref, computed, onMounted } from 'vue'
import UsuariosOnline from './UsuariosOnline.vue'

const props = defineProps({ usuarioLogado: String })
const emit = defineEmits(['logout', 'toast', 'abrir-perfil'])
const humorSelecionado = ref('')
const humores = [{ emoji: '😄', nome: 'Bem' }, { emoji: '🙂', nome: 'Ok' }, { emoji: '😔', nome: 'Triste' }, { emoji: '😡', nome: 'Irritado' }, { emoji: '😰', nome: 'Ansioso' }]

const desabafos = ref([])
const quantidadeVisivel = ref(5)
const desabafosVisiveis = computed(() => desabafos.value.slice(0, quantidadeVisivel.value))
const novoDesabafo = ref('')
const tempoJuntos = ref('')
const sentimento = ref('')
const postarAnonimo = ref(true)
const publicando = ref(false)
const carregando = ref(true)

const modalConselhoAberto = ref(false)
const desabafoSelecionado = ref(null)
const listaConselhos = ref([])
const mostrarTodosConselhos = ref(false)
const digitandoPessoas = ref([])
let digitandoTimer = null
let digitandoPingTimer = null
const textoConselho = ref('')
const conselhoAnonimo = ref(true)
const enviandoConselho = ref(false)

const reacoesDisponiveis = ['❤️', '👍', '😂', '😮', '😢', '🙏', '💡', '🔥']
const enviandoReacao = ref({})
const conselhoReagindo = ref(null)

const nomeExibicaoCache = ref({})
const seguindoUsuarios = ref({})
const processandoSeguir = ref({})

const formatarData = (dataString) => {
  if (!dataString) return 'Agora mesmo'
  const data = new Date(dataString)
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const getSentimentoEmoji = (sentimento) => {
  const map = { 'Tristeza': '😢', 'Raiva': '😡', 'Incerteza': '🤔', 'Ciúmes': '😤', 'Medo': '😨', 'Frustração': '😩' }
  return map[sentimento] || '❤️'
}

const buscarNomeExibicao = async (email) => {
  if (nomeExibicaoCache.value[email]) {
    return nomeExibicaoCache.value[email]
  }
  try {
    const res = await fetch(`https://meusocial-api.onrender.com/api/usuario/${email}`)
    const data = await res.json()
    if (data.sucesso) {
      nomeExibicaoCache.value[email] = data.nome_exibicao
      return data.nome_exibicao
    }
    return email.split('@')[0]
  } catch (error) {
    return email.split('@')[0]
  }
}

const carregarStatusSeguir = async (seguido) => {
  if (!seguido || !seguido.includes('@') || seguido === props.usuarioLogado) return
  try {
    const query = new URLSearchParams({ seguidor: props.usuarioLogado, seguido })
    const res = await fetch(`https://meusocial-api.onrender.com/api/seguir/status?${query}`)
    const data = await res.json()
    if (data.sucesso) seguindoUsuarios.value[seguido] = data.seguindo
  } catch (e) {}
}

const alternarSeguir = async (seguido) => {
  if (!seguido || processandoSeguir.value[seguido]) return
  processandoSeguir.value[seguido] = true
  try {
    const res = await fetch('https://meusocial-api.onrender.com/api/seguir', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seguidor: props.usuarioLogado, seguido })
    })
    const data = await res.json()
    if (!res.ok || !data.sucesso) throw new Error(data.erro || 'Não foi possível atualizar o seguimento.')
    seguindoUsuarios.value[seguido] = data.seguindo
    emit('toast', data.seguindo ? 'Agora você está seguindo este usuário.' : 'Você deixou de seguir este usuário.', 'success')
  } catch (e) {
    emit('toast', e.message || 'Erro ao seguir usuário.', 'error')
  } finally {
    processandoSeguir.value[seguido] = false
  }
}

const compartilharPost = async (post) => {
  const link = `${window.location.origin}/?indicado=${encodeURIComponent(post.autor)}`
  const dados = { title: 'Desabafa Coração', text: 'Venha participar do Desabafa Coração!', url: link }
  try {
    if (navigator.share) await navigator.share(dados)
    else { await navigator.clipboard.writeText(link); emit('toast', 'Link de convite copiado!', 'success') }
  } catch (e) {
    if (e?.name !== 'AbortError') emit('toast', 'Não foi possível compartilhar agora.', 'error')
  }
}

const carregarDesabafos = async () => {
  carregando.value = true
  try {
    const res = await fetch('https://meusocial-api.onrender.com/api/desabafos')
    const data = await res.json()
    if (data.sucesso) {
      for (const post of data.desabafos) {
        if (!post.autor.includes('Anônimo') && !post.autor.includes('bot_')) {
          post.nome_exibicao = await buscarNomeExibicao(post.autor)
        } else {
          post.nome_exibicao = post.autor
        }
      }
      desabafos.value = data.desabafos
      await Promise.all(data.desabafos.map(post => carregarStatusSeguir(post.autor)))
      quantidadeVisivel.value = 5
    }
  } catch (error) {
    console.error('Erro ao carregar desabafos:', error)
  } finally {
    carregando.value = false
  }
}

const publicar = async () => {
  if (!novoDesabafo.value) return
  publicando.value = true
  try {
    const res = await fetch('https://meusocial-api.onrender.com/api/desabafos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autor: props.usuarioLogado,
        texto: novoDesabafo.value,
        tempo_juntos: tempoJuntos.value || 'Não informado',
        sentimento: sentimento.value || 'Confuso',
        anonimo: postarAnonimo.value ? 1 : 0
      })
    })
    const data = await res.json()
    if (data.sucesso) {
      if (data.aviso) emit('toast', data.aviso, 'info')
      novoDesabafo.value = ''
      tempoJuntos.value = ''
      sentimento.value = ''
      await carregarDesabafos()
    } else {
      emit('toast', data.erro || 'Erro ao publicar.', 'error')
    }
  } catch (e) {
    emit('toast', 'Erro de conexão com o servidor.', 'error')
  } finally {
    publicando.value = false
  }
}

const consultarDigitacao = async () => {
  if (!desabafoSelecionado.value) return
  try {
    const res = await fetch(`https://meusocial-api.onrender.com/api/conselhos/digitando/${desabafoSelecionado.value.id}?usuario=${encodeURIComponent(props.usuarioLogado)}`)
    const data = await res.json()
    if (data.sucesso) digitandoPessoas.value = data.digitando || []
  } catch (e) {}
}
const iniciarMonitorDigitacao = () => {
  clearInterval(digitandoTimer)
  consultarDigitacao()
  digitandoTimer = setInterval(consultarDigitacao, 2000)
}
const pararMonitorDigitacao = () => {
  clearInterval(digitandoTimer)
  clearTimeout(digitandoPingTimer)
  digitandoTimer = null
  digitandoPessoas.value = []
}
const informarDigitando = () => {
  if (!desabafoSelecionado.value || !textoConselho.value.trim()) return
  fetch('https://meusocial-api.onrender.com/api/conselhos/digitando', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ desabafo_id: desabafoSelecionado.value.id, usuario: props.usuarioLogado, nome: props.usuarioLogado.split('@')[0], digitando: true }) }).catch(() => {})
  clearTimeout(digitandoPingTimer)
  digitandoPingTimer = setTimeout(encerrarDigitando, 4500)
}
const encerrarDigitando = () => {
  if (!desabafoSelecionado.value) return
  fetch('https://meusocial-api.onrender.com/api/conselhos/digitando', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ desabafo_id: desabafoSelecionado.value.id, usuario: props.usuarioLogado, digitando: false }) }).catch(() => {})
}
const fecharConselhos = () => {
  encerrarDigitando()
  pararMonitorDigitacao()
  modalConselhoAberto.value = false
}

const abrirConselhos = async (post) => {
  desabafoSelecionado.value = post
  modalConselhoAberto.value = true
  textoConselho.value = ''
  listaConselhos.value = []
  mostrarTodosConselhos.value = false
  conselhoReagindo.value = null
  iniciarMonitorDigitacao()

  try {
    const res = await fetch(`https://meusocial-api.onrender.com/api/conselhos/${post.id}`)
    const data = await res.json()
    if (data.sucesso) {
      listaConselhos.value = data.conselhos
    }
  } catch (error) {
    console.error('Erro ao carregar conselhos', error)
  }
}

const enviarConselho = async () => {
  if (!textoConselho.value.trim()) return
  enviandoConselho.value = true

  try {
    const res = await fetch('https://meusocial-api.onrender.com/api/conselhos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        desabafo_id: desabafoSelecionado.value.id,
        autor: props.usuarioLogado,
        texto: textoConselho.value,
        anonimo: conselhoAnonimo.value ? 1 : 0
      })
    })
    const data = await res.json()

    if (data.sucesso) {
      if (data.aviso) emit('toast', data.aviso, 'info')
      textoConselho.value = ''
      encerrarDigitando()
      await abrirConselhos(desabafoSelecionado.value)
      await carregarDesabafos()
      setTimeout(() => {
        fecharConselhos()
        carregarDesabafos()
      }, 2000)
    } else if (data.limite_atingido) {
      emit('toast', '🔒 Você atingiu o limite de 5 conselhos gratuitos. Conheça o VIP!', 'warning')
    } else {
      emit('toast', data.erro || 'Erro ao enviar conselho.', 'error')
    }
  } catch (error) {
    emit('toast', 'Erro de conexão com o servidor.', 'error')
  } finally {
    enviandoConselho.value = false
  }
}

const abrirSeletorReacao = (conselhoId) => {
  if (conselhoReagindo.value === conselhoId) {
    conselhoReagindo.value = null
  } else {
    conselhoReagindo.value = conselhoId
  }
}

const enviarReacao = async (conselhoId, reacao) => {
  if (enviandoReacao.value[conselhoId]) return
  enviandoReacao.value[conselhoId] = true

  try {
    const res = await fetch('https://meusocial-api.onrender.com/api/reacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conselho_id: conselhoId,
        usuario: props.usuarioLogado,
        reacao: reacao
      })
    })
    const data = await res.json()
    if (data.sucesso) {
      conselhoReagindo.value = null
      await abrirConselhos(desabafoSelecionado.value)
    }
  } catch (error) {
    console.error('Erro ao reagir:', error)
  } finally {
    enviandoReacao.value[conselhoId] = false
  }
}

const getReacaoUsuario = (conselho) => {
  if (!conselho.reacoes) return null
  for (const [emoji, usuarios] of Object.entries(conselho.reacoes)) {
    if (usuarios.includes(props.usuarioLogado)) {
      return emoji
    }
  }
  return null
}

const getTopReacoes = (conselho) => {
  if (!conselho.reacoes) return []
  return Object.entries(conselho.reacoes)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 2)
}

onMounted(carregarDesabafos)
</script>

<template>
  <div class="pb-4">
    <UsuariosOnline />

    <div class="mood-check mx-3 sm:mx-0 mt-4">
      <p class="text-sm font-black text-[#211F3B]">Como está seu coração hoje?</p>
      <p class="text-xs text-[#77748B] mt-1">Um pequeno check-in para você se ouvir.</p>
      <div class="flex gap-1 sm:gap-2 mt-3">
        <button v-for="humor in humores" :key="humor.nome" @click="humorSelecionado = humor.nome" :class="['mood-button', humorSelecionado === humor.nome && 'selected']" :title="humor.nome"><span>{{ humor.emoji }}</span><small>{{ humor.nome }}</small></button>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-[#eeeaff] px-5 py-4 mt-4 mx-3 sm:mx-0 flex items-center gap-4 shadow-sm">
      <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-[#6C63FF] to-[#FF6B9D] flex items-center justify-center text-white font-bold text-lg shadow-md">
        {{ usuarioLogado.charAt(0).toUpperCase() }}
      </div>
      <div class="flex-1">
        <p class="font-bold text-sm text-[#1A1A2E]">{{ usuarioLogado.split('@')[0] }}</p>
        <p class="text-xs text-[#8e8e8e]">💖 Como está seu coração hoje?</p>
      </div>
      <span class="text-xs bg-[#f5f5f5] text-[#6C757D] px-3 py-1 rounded-full">❤️</span>
    </div>

    <div class="bg-white rounded-2xl border border-[#eeeaff] px-4 sm:px-5 py-5 mx-3 sm:mx-0 mt-4 shadow-sm">
      <textarea 
        v-model="novoDesabafo"
        rows="3" 
        placeholder="Escreva seu problema... A comunidade vai te aconselhar."
        class="w-full bg-[#fafafa] border border-[#efefef] rounded-xl p-4 text-sm text-[#1A1A2E] placeholder-[#adb5bd] focus:outline-none focus:border-[#6C63FF] transition-all resize-none"
      ></textarea>
      
      <div class="flex flex-wrap gap-2 mt-3">
        <select v-model="tempoJuntos" class="text-xs bg-[#fafafa] border border-[#efefef] px-3 py-2 rounded-lg text-[#6C757D] focus:outline-none focus:border-[#6C63FF] cursor-pointer">
          <option value="" disabled selected>⏱️ Tempo juntos</option>
          <option value="Menos de 1 mês">Menos de 1 mês</option>
          <option value="Alguns meses">Alguns meses</option>
          <option value="1 a 3 anos">1 a 3 anos</option>
          <option value="Mais de 3 anos">Mais de 3 anos</option>
          <option value="Casados">Casados</option>
        </select>

        <select v-model="sentimento" class="text-xs bg-[#fafafa] border border-[#efefef] px-3 py-2 rounded-lg text-[#6C757D] focus:outline-none focus:border-[#6C63FF] cursor-pointer">
          <option value="" disabled selected>🥺 Sentimento</option>
          <option value="Tristeza">Tristeza</option>
          <option value="Raiva">Raiva</option>
          <option value="Incerteza">Incerteza</option>
          <option value="Ciúmes">Ciúmes</option>
          <option value="Medo">Medo</option>
          <option value="Frustração">Frustração</option>
        </select>

        <button 
          @click="publicar"
          :disabled="publicando || !novoDesabafo"
          class="w-full mt-3 bg-gradient-to-r from-[#6C63FF] to-[#FF6B9D] hover:scale-[1.01] active:scale-95 disabled:opacity-50 text-white text-sm font-bold py-3 rounded-xl shadow-md transition-all"
        >
          {{ publicando ? '...' : 'Desabafar' }}
        </button>
      </div>

      <div class="flex items-center gap-2 mt-3 pt-3 border-t border-[#efefef]">
        <input type="checkbox" id="anonimoCheck" v-model="postarAnonimo" class="w-4 h-4 accent-[#6C63FF] rounded cursor-pointer" />
        <label for="anonimoCheck" class="text-xs text-[#8e8e8e] cursor-pointer select-none">
          Publicar anonimamente
        </label>
      </div>
    </div>

    <div v-if="carregando" class="space-y-4 p-3 sm:p-0 mt-4">
      <div v-for="n in 3" :key="n" class="skeleton-card"><div class="skeleton-avatar"></div><div class="flex-1 space-y-2"><div class="skeleton-line w-1/3"></div><div class="skeleton-line w-full"></div><div class="skeleton-line w-2/3"></div></div></div>
    </div>

    <div v-else-if="desabafos.length > 0">
      <div class="feed-heading mx-3 sm:mx-0 mt-5">
        <div><p class="text-base font-black text-[#211F3B]">Desabafos recentes</p><p class="text-xs text-[#77748B] mt-1">Veja o que a comunidade está sentindo.</p></div>
        <span class="post-count">{{ desabafos.length }} {{ desabafos.length === 1 ? 'publicação' : 'publicações' }}</span>
      </div>
      <div v-for="post in desabafosVisiveis" :key="post.id" class="bg-white rounded-2xl border border-[#eeeaff] px-4 sm:px-5 py-4 mx-3 sm:mx-0 mt-3 shadow-sm">
        <div class="flex items-start gap-3">
          <div @click="post.autor.includes('@') && emit('abrir-perfil', post.autor)" class="w-10 h-10 rounded-full overflow-hidden bg-[#f5f5f5] border-2 border-[#6C63FF] flex items-center justify-center text-[#6C63FF] font-bold text-sm flex-shrink-0" :class="post.autor.includes('@') ? 'cursor-pointer' : ''">
            <img v-if="post.foto_autor" :src="post.foto_autor" class="w-full h-full object-cover" />
            <span v-else>{{ post.nome_exibicao ? post.nome_exibicao.charAt(0).toUpperCase() : '?' }}</span>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span @click="post.autor.includes('@') && emit('abrir-perfil', post.autor)" class="font-bold text-sm text-[#1A1A2E]" :class="post.autor.includes('@') ? 'cursor-pointer' : ''">{{ post.nome_exibicao || post.autor }}</span>
              <button v-if="post.autor.includes('@') && post.autor !== usuarioLogado" @click="alternarSeguir(post.autor)" :disabled="processandoSeguir[post.autor]" class="text-[10px] font-bold text-[#6C63FF] hover:text-[#FF6B9D] disabled:opacity-50">{{ seguindoUsuarios[post.autor] ? 'Seguindo' : 'Seguir' }}</button>
              <button @click="compartilharPost(post)" class="text-[10px] font-bold text-[#77748B] hover:text-[#6C63FF]" title="Compartilhar convite">↗ Compartilhar</button>
              <span class="text-xs text-[#8e8e8e]">• {{ formatarData(post.data_publicacao) }}</span>
              <span class="text-xs text-[#6C757D] ml-auto bg-[#f5f5f5] px-2 py-0.5 rounded-full">
                {{ post.termometro }}
              </span>
            </div>
            <p class="text-sm text-[#262626] mt-1 leading-relaxed">{{ post.texto }}</p>
            <div class="flex items-center gap-3 mt-2">
              <span class="text-xs font-medium text-[#6C63FF]">{{ getSentimentoEmoji(post.sentimento) }} {{ post.sentimento }}</span>
              <span class="text-xs text-[#8e8e8e]">⏱️ {{ post.tempo_juntos }}</span>
            </div>
            <button @click="abrirConselhos(post)" class="mt-2 text-sm text-[#6C63FF] font-semibold hover:text-[#FF6B9D] transition-colors flex items-center gap-1">
              💬 Conselhos ({{ post.comentarios || 0 }})
            </button>
          </div>
        </div>
      </div>
      <button v-if="quantidadeVisivel < desabafos.length" @click="quantidadeVisivel += 5" class="load-more-button mx-3 sm:mx-0 mt-4">
        <span>Carregar mais desabafos</span><span>↓</span>
      </button>
      <p v-else-if="desabafos.length > 5" class="text-center text-xs text-[#aaa6bd] mt-5">Você chegou ao fim dos desabafos.</p>
    </div>

    <div v-else class="text-center py-16">
      <svg class="w-16 h-16 mx-auto text-[#e9ecef]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      <p class="text-[#8e8e8e] mt-2">Nenhum desabafo ainda. Seja o primeiro!</p>
    </div>

    <!-- MODAL DE CONSELHOS -->
    <div v-if="modalConselhoAberto" class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[85vh] flex flex-col">
        
        <button @click="fecharConselhos" class="absolute top-4 right-4 text-[#8e8e8e] hover:text-[#1A1A2E]">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <h3 class="text-lg font-bold text-[#1A1A2E] mb-4">💬 Conselhos da Comunidade</h3>

        <div v-if="desabafoSelecionado" class="bg-[#f8f9fa] rounded-2xl p-4 mb-4 text-sm text-[#1A1A2E]">
          <p class="font-bold text-[#6C63FF] mb-1">{{ desabafoSelecionado.nome_exibicao || desabafoSelecionado.autor }}</p>
          <p>{{ desabafoSelecionado.texto }}</p>
        </div>

        <div v-if="digitandoPessoas.length" class="typing-indicator mb-3">
          <span class="typing-dots"><i></i><i></i><i></i></span>
          <strong>{{ digitandoPessoas.length === 1 ? digitandoPessoas[0] : 'Alguém da comunidade' }}</strong> está escrevendo uma resposta...
        </div>

        <div class="flex-1 overflow-y-auto space-y-2 mb-3 pr-1 max-h-[45vh]">
          <div v-if="listaConselhos.length === 0" class="text-center py-6 text-sm text-[#8e8e8e]">
            Nenhum conselho ainda. Seja o primeiro a ajudar!
          </div>
          
          <div v-for="conselho in (mostrarTodosConselhos ? listaConselhos : listaConselhos.slice(0, 3))" :key="conselho.id" class="bg-[#f8f9fa] rounded-xl p-3">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <div @click="emit('abrir-perfil', conselho.usuario || conselho.autor)" class="w-8 h-8 rounded-full overflow-hidden bg-[#6C63FF] flex items-center justify-center text-white text-[10px] font-bold cursor-pointer">
                  <img v-if="conselho.foto_autor" :src="conselho.foto_autor" class="w-full h-full object-cover" />
                  <span v-else>{{ conselho.autor.charAt(0).toUpperCase() }}</span>
                </div>
                <span @click="emit('abrir-perfil', conselho.usuario || conselho.autor)" class="font-bold text-sm text-[#1A1A2E] cursor-pointer">{{ conselho.autor }}</span>
                <span v-if="conselho.is_bot" class="text-[10px] bg-[#6C63FF]/10 text-[#6C63FF] px-2 py-0.5 rounded-full">🤖</span>
                <span v-if="!conselho.is_bot && !conselho.autor.includes('Anônimo')" class="text-[10px] bg-[#6C63FF]/10 text-[#6C63FF] px-2 py-0.5 rounded-full">🟢 Real</span>
              </div>
              <span class="text-[10px] text-[#8e8e8e]">{{ formatarData(conselho.data_publicacao) }}</span>
            </div>
            <p class="text-sm text-[#262626] pl-10 line-clamp-3 leading-relaxed">{{ conselho.texto }}</p>
            
            <!-- REAÇÕES -->
            <div class="flex items-center gap-2 mt-3 pl-10">
              <button 
                @click="abrirSeletorReacao(conselho.id)"
                class="flex items-center gap-1 text-sm hover:bg-[#f5f5f5] px-3 py-1 rounded-full transition-colors border border-[#efefef] hover:border-[#6C63FF] relative"
                :class="{ 'bg-[#f5f5f5] border-[#6C63FF]': conselhoReagindo === conselho.id }"
              >
                <span v-if="getReacaoUsuario(conselho)" class="text-base">{{ getReacaoUsuario(conselho) }}</span>
                <span v-else class="text-gray-400 text-base">❤️</span>
                <span class="text-xs text-[#8e8e8e] font-medium">
                  {{ Object.values(conselho.reacoes || {}).reduce((sum, arr) => sum + arr.length, 0) || 0 }}
                </span>
              </button>

              <div v-for="[emoji, data] in getTopReacoes(conselho)" :key="emoji" class="flex items-center gap-0.5 text-sm">
                <span>{{ emoji }}</span>
                <span class="text-xs text-[#8e8e8e]">{{ data.length }}</span>
              </div>

              <div 
                v-if="conselhoReagindo === conselho.id"
                class="absolute mt-2 -ml-2 bg-white rounded-full shadow-xl border border-[#efefef] p-1 flex gap-0.5 z-50"
                style="transform: translateY(28px);"
              >
                <button 
                  v-for="emoji in reacoesDisponiveis" 
                  :key="emoji"
                  @click="enviarReacao(conselho.id, emoji)"
                  :disabled="enviandoReacao[conselho.id]"
                  class="text-xl hover:bg-[#f5f5f5] rounded-full p-1.5 transition-colors hover:scale-110 disabled:opacity-50"
                  :class="{ 'bg-[#f5f5f5]': getReacaoUsuario(conselho) === emoji }"
                >
                  {{ emoji }}
                </button>
              </div>
            </div>
          </div>
          <button v-if="listaConselhos.length > 3" @click="mostrarTodosConselhos = !mostrarTodosConselhos" class="w-full text-xs font-bold text-[#6C63FF] py-2 hover:bg-[#eeeaff] rounded-lg transition-colors">
            {{ mostrarTodosConselhos ? 'Mostrar menos' : `Ver todos os ${listaConselhos.length} conselhos` }}
          </button>
        </div>

        <div class="mt-auto pt-3 border-t border-[#efefef]">
          <textarea 
            v-model="textoConselho"
            @input="informarDigitando"
            rows="2"
            placeholder="Escreva seu conselho com empatia..."
            class="w-full bg-[#f8f9fa] border border-[#efefef] rounded-xl p-3 text-sm text-[#1A1A2E] placeholder-[#adb5bd] focus:outline-none focus:border-[#6C63FF] resize-none"
          ></textarea>
          
          <div class="flex justify-between items-center mt-2">
            <div class="flex items-center gap-2">
              <input type="checkbox" id="anonimoConselho" v-model="conselhoAnonimo" class="w-3.5 h-3.5 accent-[#6C63FF] rounded cursor-pointer" />
              <label for="anonimoConselho" class="text-[11px] text-[#8e8e8e] cursor-pointer select-none">Conselho anônimo</label>
            </div>
            <button 
              @click="enviarConselho"
              :disabled="enviandoConselho || !textoConselho.trim()"
              class="bg-gradient-to-r from-[#6C63FF] to-[#FF6B9D] hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold py-2 px-5 rounded-xl shadow-md transition-all"
            >
              {{ enviandoConselho ? '...' : 'Enviar' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
