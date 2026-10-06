<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({ usuarioLogado: String })
const emit = defineEmits(['fechar'])

const desabafos = ref([])
const carregando = ref(true)
const desabafoSelecionado = ref(null)
const modalVisualizar = ref(false)
const textoResposta = ref('')
const enviandoResposta = ref(false)

const carregarMeusDesabafos = async () => {
  carregando.value = true
  try {
    const res = await fetch('https://meusocial.onrender.com/api/desabafos')
    const data = await res.json()
    if (data.sucesso) {
      const email = props.usuarioLogado
      desabafos.value = data.desabafos.filter(d => d.autor === email)
    }
  } catch (error) {
    console.error('Erro ao carregar desabafos:', error)
  } finally {
    carregando.value = false
  }
}

const formatarData = (dataString) => {
  if (!dataString) return 'Agora mesmo'
  const data = new Date(dataString)
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const getStatusResposta = (post) => {
  if (post.comentarios > 0) {
    return '✅ Respondido'
  }
  return '⏳ Aguardando resposta...'
}

const getStatusClass = (post) => {
  if (post.comentarios > 0) {
    return 'text-green-500'
  }
  return 'text-yellow-500'
}

const visualizarDesabafo = async (post) => {
  desabafoSelecionado.value = post
  modalVisualizar.value = true
  textoResposta.value = ''
  
  try {
    const res = await fetch(`https://meusocial.onrender.com/api/conselhos/${post.id}`)
    const data = await res.json()
    if (data.sucesso) {
      desabafoSelecionado.value.conselhos = data.conselhos
    }
  } catch (error) {
    console.error('Erro ao carregar conselhos:', error)
  }
}

const enviarResposta = async () => {
  if (!textoResposta.value.trim()) return
  
  enviandoResposta.value = true
  try {
    const res = await fetch('https://meusocial.onrender.com/api/conselhos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        desabafo_id: desabafoSelecionado.value.id,
        autor: props.usuarioLogado,
        texto: textoResposta.value,
        anonimo: 0
      })
    })
    const data = await res.json()
    if (data.sucesso) {
      textoResposta.value = ''
      await visualizarDesabafo(desabafoSelecionado.value)
      await carregarMeusDesabafos()
    } else {
      alert(data.erro || 'Erro ao enviar resposta.')
    }
  } catch (error) {
    alert('Erro de conexão.')
  } finally {
    enviandoResposta.value = false
  }
}

onMounted(carregarMeusDesabafos)
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
    <div class="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[85vh] flex flex-col">
      
      <button @click="$emit('fechar')" class="absolute top-4 right-4 text-[#8e8e8e] hover:text-[#1A1A2E]">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>

      <h3 class="text-xl font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
        💬 Minhas Mensagens
        <span class="text-xs bg-[#6C63FF]/10 text-[#6C63FF] px-2 py-1 rounded-full">{{ desabafos.length }}</span>
      </h3>

      <div class="flex-1 overflow-y-auto space-y-3 pr-1">
        <div v-if="carregando" class="text-center py-10">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#6C63FF] border-t-transparent"></div>
        </div>

        <div v-else-if="desabafos.length === 0" class="text-center py-10">
          <svg class="w-16 h-16 mx-auto text-[#e9ecef]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <p class="text-sm text-[#8e8e8e] mt-2">Você ainda não tem mensagens</p>
          <p class="text-xs text-[#adb5bd]">Publique um desabafo e aguarde respostas!</p>
        </div>

        <div v-for="post in desabafos" :key="post.id" class="bg-[#f8f9fa] rounded-xl p-4 border border-[#efefef]">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-medium text-[#6C63FF]">{{ post.autor }}</span>
              </div>
              <p class="text-sm font-medium text-[#1A1A2E]">{{ post.texto.substring(0, 80) }}{{ post.texto.length > 80 ? '...' : '' }}</p>
              <div class="flex items-center gap-3 mt-2">
                <span class="text-xs text-[#8e8e8e]">{{ formatarData(post.data_publicacao) }}</span>
                <span class="text-xs font-medium" :class="getStatusClass(post)">
                  {{ getStatusResposta(post) }}
                </span>
                <span class="text-xs bg-[#f5f5f5] text-[#6C757D] px-2 py-0.5 rounded-full">
                  {{ post.comentarios || 0 }} respostas
                </span>
              </div>
            </div>
            
            <div class="flex flex-col gap-1 ml-2">
              <button 
                @click="visualizarDesabafo(post)"
                class="text-xs bg-[#6C63FF]/10 text-[#6C63FF] hover:bg-[#6C63FF]/20 px-3 py-1 rounded-lg transition-colors font-medium"
              >
                👁️ Ver
              </button>
              <button 
                @click="visualizarDesabafo(post)"
                class="text-xs bg-[#FF6B9D]/10 text-[#FF6B9D] hover:bg-[#FF6B9D]/20 px-3 py-1 rounded-lg transition-colors font-medium"
              >
                💬 Responder
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-[#efefef]">
        <button 
          @click="$emit('fechar')"
          class="w-full bg-[#f5f5f5] hover:bg-[#e9ecef] text-[#1A1A2E] font-semibold py-2 rounded-xl transition-colors"
        >
          Fechar
        </button>
      </div>

    </div>
  </div>

  <!-- MODAL DE VISUALIZAR -->
  <div v-if="modalVisualizar && desabafoSelecionado" class="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
    <div class="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[85vh] flex flex-col">
      
      <button @click="modalVisualizar = false" class="absolute top-4 right-4 text-[#8e8e8e] hover:text-[#1A1A2E]">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>

      <h3 class="text-lg font-bold text-[#1A1A2E] mb-4">💬 Seu Desabafo</h3>

      <div class="bg-[#f8f9fa] rounded-2xl p-4 mb-4">
        <p class="text-sm text-[#6C757D] mb-1">{{ formatarData(desabafoSelecionado.data_publicacao) }}</p>
        <p class="text-sm text-[#1A1A2E] font-medium">{{ desabafoSelecionado.texto }}</p>
        <div class="flex items-center gap-3 mt-2">
          <span class="text-xs bg-[#f5f5f5] px-2 py-0.5 rounded-full">{{ desabafoSelecionado.sentimento }}</span>
          <span class="text-xs bg-[#f5f5f5] px-2 py-0.5 rounded-full">⏱️ {{ desabafoSelecionado.tempo_juntos }}</span>
        </div>
      </div>

      <h4 class="text-sm font-semibold text-[#1A1A2E] mb-2 flex items-center gap-2">
        💬 Respostas ({{ desabafoSelecionado.conselhos?.length || 0 }})
      </h4>

      <div class="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
        <div v-if="!desabafoSelecionado.conselhos || desabafoSelecionado.conselhos.length === 0" class="text-center py-4">
          <p class="text-xs text-[#8e8e8e]">Nenhuma resposta ainda. Seja o primeiro a responder!</p>
        </div>
        <div v-for="conselho in desabafoSelecionado.conselhos" :key="conselho.id" class="bg-[#f8f9fa] rounded-xl p-3 border border-[#efefef]">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-bold text-[#6C63FF]">{{ conselho.autor }}</span>
            <span class="text-[10px] text-[#8e8e8e]">{{ formatarData(conselho.data_publicacao) }}</span>
          </div>
          <p class="text-sm text-[#262626]">{{ conselho.texto }}</p>
        </div>
      </div>

      <div class="border-t border-[#efefef] pt-3">
        <textarea 
          v-model="textoResposta"
          rows="2"
          placeholder="Escreva sua resposta..."
          class="w-full bg-[#f8f9fa] border border-[#efefef] rounded-xl p-3 text-sm text-[#1A1A2E] placeholder-[#adb5bd] focus:outline-none focus:border-[#6C63FF] resize-none"
        ></textarea>
        <button 
          @click="enviarResposta"
          :disabled="enviandoResposta || !textoResposta.trim()"
          class="w-full mt-2 bg-gradient-to-r from-[#6C63FF] to-[#FF6B9D] hover:opacity-90 disabled:opacity-50 text-white font-bold py-2 rounded-xl shadow-md transition-all text-sm"
        >
          {{ enviandoResposta ? 'Enviando...' : '💬 Enviar Resposta' }}
        </button>
      </div>

    </div>
  </div>
</template>