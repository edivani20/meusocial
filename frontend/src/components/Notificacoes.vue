<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps({ usuarioLogado: String })

const notificacoes = ref([])
const carregando = ref(true)
const aberto = ref(false)
const tremendo = ref(false)
let intervalo = null
let audioContext = null

const notificacoesNaoLidas = computed(() => {
  return notificacoes.value.filter(n => !n.lida).length
})

const tocarSomNotificacao = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 880
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
    
    setTimeout(() => {
      const osc2 = audioContext.createOscillator()
      const gain2 = audioContext.createGain()
      osc2.connect(gain2)
      gain2.connect(audioContext.destination)
      osc2.frequency.value = 1100
      osc2.type = 'sine'
      gain2.gain.setValueAtTime(0.2, audioContext.currentTime)
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)
      osc2.start(audioContext.currentTime)
      osc2.stop(audioContext.currentTime + 0.15)
    }, 150)
    
  } catch (error) {
    console.log('Erro ao tocar som:', error)
  }
}

const tremerSino = () => {
  tremendo.value = true
  setTimeout(() => {
    tremendo.value = false
  }, 600)
}

const carregarNotificacoes = async () => {
  try {
    const res = await fetch(`https://meusocial.onrender.com/api/notificacoes/${props.usuarioLogado}`)
    const data = await res.json()
    if (data.sucesso) {
      const novasNotificacoes = data.notificacoes
      const novasNaoLidas = novasNotificacoes.filter(n => !n.lida)
      const antigasNaoLidas = notificacoes.value.filter(n => !n.lida)
      
      if (novasNaoLidas.length > antigasNaoLidas.length) {
        tocarSomNotificacao()
        tremerSino()
      }
      
      notificacoes.value = novasNotificacoes
    }
  } catch (error) {
    console.error('Erro ao carregar notificações:', error)
  } finally {
    carregando.value = false
  }
}

const marcarComoLida = async (id) => {
  try {
    await fetch(`https://meusocial.onrender.com/api/notificacoes/ler/${id}`, { method: 'PUT' })
    const notif = notificacoes.value.find(n => n.id === id)
    if (notif) notif.lida = 1
  } catch (error) {
    console.error('Erro ao marcar como lida:', error)
  }
}

const marcarTodasComoLidas = async () => {
  try {
    await fetch(`https://meusocial.onrender.com/api/notificacoes/ler-todas/${props.usuarioLogado}`, { method: 'PUT' })
    notificacoes.value.forEach(n => n.lida = 1)
  } catch (error) {
    console.error('Erro ao marcar todas como lidas:', error)
  }
}

const toggleAberto = () => {
  aberto.value = !aberto.value
  if (aberto.value) {
    carregarNotificacoes()
  }
}

const formatarData = (dataString) => {
  if (!dataString) return 'Agora mesmo'
  const data = new Date(dataString)
  const agora = new Date()
  const diff = Math.floor((agora - data) / 1000 / 60)
  
  if (diff < 1) return 'Agora mesmo'
  if (diff < 60) return `${diff} min atrás`
  if (diff < 1440) return `${Math.floor(diff / 60)}h atrás`
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

onMounted(() => {
  carregarNotificacoes()
  intervalo = setInterval(carregarNotificacoes, 5000)
})

onUnmounted(() => {
  if (intervalo) clearInterval(intervalo)
  if (audioContext) {
    audioContext.close()
  }
})
</script>

<template>
  <div class="relative">
    <button 
      @click="toggleAberto"
      class="relative p-1.5 rounded-full hover:bg-[#f5f5f5] transition-colors"
    >
      <svg 
        class="w-6 h-6 text-[#1A1A2E] transition-transform duration-100"
        :class="{ 'animate-shake': tremendo }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
      </svg>
      
      <span 
        v-if="notificacoesNaoLidas > 0"
        class="absolute -top-1 -right-1 bg-[#FF6B9D] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse"
      >
        {{ notificacoesNaoLidas > 9 ? '9+' : notificacoesNaoLidas }}
      </span>
    </button>

    <div 
      v-if="aberto"
      class="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#efefef] max-h-96 overflow-hidden z-50"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-[#efefef]">
        <h3 class="font-bold text-[#1A1A2E]">🔔 Notificações</h3>
        <button 
          v-if="notificacoesNaoLidas > 0"
          @click="marcarTodasComoLidas"
          class="text-xs text-[#6C63FF] font-semibold hover:underline"
        >
          Marcar todas como lidas
        </button>
      </div>

      <div class="overflow-y-auto max-h-72">
        <div v-if="carregando" class="text-center py-6">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-4 border-[#6C63FF] border-t-transparent"></div>
        </div>

        <div v-else-if="notificacoes.length === 0" class="text-center py-8">
          <svg class="w-12 h-12 mx-auto text-[#e9ecef]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          <p class="text-sm text-[#8e8e8e] mt-2">Nenhuma notificação</p>
        </div>

        <div v-else>
          <div 
            v-for="notif in notificacoes" 
            :key="notif.id"
            @click="marcarComoLida(notif.id)"
            class="px-4 py-3 border-b border-[#efefef] hover:bg-[#f8f9fa] cursor-pointer transition-colors"
            :class="{ 'bg-[#f0edff]': !notif.lida }"
          >
            <div class="flex items-start gap-2">
              <span class="text-lg">💬</span>
              <div class="flex-1">
                <p class="text-sm text-[#1A1A2E]">{{ notif.mensagem }}</p>
                <p class="text-[10px] text-[#8e8e8e] mt-1">{{ formatarData(notif.data_criacao) }}</p>
              </div>
            </div>
            <span v-if="!notif.lida" class="inline-block w-2 h-2 bg-[#FF6B9D] rounded-full mt-1"></span>
          </div>
        </div>
      </div>

      <button 
        @click="toggleAberto"
        class="w-full text-center text-sm text-[#6C63FF] font-semibold py-2 border-t border-[#efefef] hover:bg-[#f8f9fa] transition-colors"
      >
        Fechar
      </button>
    </div>
  </div>
</template>

<style>
@keyframes shake {
  0%, 100% { transform: rotate(0deg); }
  10%, 30%, 50%, 70%, 90% { transform: rotate(-15deg); }
  20%, 40%, 60%, 80% { transform: rotate(15deg); }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

@keyframes pulse-badge {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.animate-pulse {
  animation: pulse-badge 1s ease-in-out infinite;
}
</style>