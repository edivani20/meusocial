<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({ usuario: { type: String, required: true }, usuarioLogado: { type: String, required: true } })
const emit = defineEmits(['fechar', 'toast'])
const perfil = ref(null)
const carregando = ref(true)
const seguindo = ref(false)
const processando = ref(false)
const enviandoConvite = ref(false)
const conviteEnviado = ref(false)
const erro = ref('')

const carregar = async () => {
  try {
    const url = `https://meusocial-api.onrender.com/api/perfil/${encodeURIComponent(props.usuario)}?visualizador=${encodeURIComponent(props.usuarioLogado)}`
    const res = await fetch(url)
    const data = await res.json()
    if (!res.ok || !data.sucesso) throw new Error(data.erro || 'Perfil não encontrado.')
    perfil.value = data
    seguindo.value = !!data.is_seguindo
  } catch (e) {
    erro.value = e.message || 'Não foi possível carregar o perfil.'
  } finally {
    carregando.value = false
  }
}

const solicitarChat = async () => {
  if (!perfil.value || enviandoConvite.value) return
  enviandoConvite.value = true
  try {
    const res = await fetch('https://meusocial-api.onrender.com/api/chat/solicitar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ solicitante: props.usuarioLogado, destinatario: perfil.value.usuario }) })
    const data = await res.json()
    if (!res.ok || !data.sucesso) throw new Error(data.erro || 'Não foi possível enviar o convite.')
    conviteEnviado.value = true
    emit('toast', data.aceita ? 'Vocês já podem conversar.' : 'Convite enviado! A pessoa poderá aceitar ou recusar.', 'success')
  } catch (e) { emit('toast', e.message, 'error') }
  finally { enviandoConvite.value = false }
}

const alternarSeguir = async () => {
  if (!perfil.value || processando.value) return
  processando.value = true
  try {
    const res = await fetch('https://meusocial-api.onrender.com/api/seguir', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seguidor: props.usuarioLogado, seguido: perfil.value.usuario })
    })
    const data = await res.json()
    if (!res.ok || !data.sucesso) throw new Error(data.erro || 'Não foi possível seguir este usuário.')
    seguindo.value = data.seguindo
    perfil.value.total_seguidores = data.total_seguidores
    emit('toast', data.seguindo ? 'Agora você está seguindo este usuário.' : 'Você deixou de seguir este usuário.', 'success')
  } catch (e) {
    emit('toast', e.message || 'Erro ao atualizar seguimento.', 'error')
  } finally {
    processando.value = false
  }
}

onMounted(carregar)
</script>

<template>
  <div class="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-black/55 backdrop-blur-sm" @click.self="emit('fechar')">
    <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
      <button @click="emit('fechar')" class="absolute right-4 top-3 z-10 text-3xl text-white/90 hover:text-white">×</button>
      <div v-if="carregando" class="p-12 text-center text-[#77748B]">Carregando perfil...</div>
      <div v-else-if="erro" class="p-10 text-center"><p class="text-[#dc2626] mb-4">{{ erro }}</p><button @click="emit('fechar')" class="text-[#5149c8] font-bold">Fechar</button></div>
      <template v-else-if="perfil">
        <div class="h-28 bg-gradient-to-r from-[#5149c8] to-[#ff6b9d]"></div>
        <div class="px-6 pb-7 text-center">
          <div class="-mt-12 mx-auto w-24 h-24 rounded-full p-1 bg-white shadow-lg">
            <div class="w-full h-full rounded-full overflow-hidden bg-gradient-to-tr from-[#6C63FF] to-[#FF6B9D] flex items-center justify-center text-3xl font-bold text-white"><img v-if="perfil.foto_perfil" :src="perfil.foto_perfil" class="w-full h-full object-cover" /><span v-else>{{ perfil.nome_exibicao.charAt(0).toUpperCase() }}</span></div>
          </div>
          <h2 class="text-xl font-black text-[#211F3B] mt-3">{{ perfil.nome_exibicao }}</h2>
          <span v-if="perfil.is_premium" class="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#FDCB6E] text-[#211F3B] text-[10px] font-black">VIP</span>
          <p class="text-sm text-[#77748B] mt-2">{{ perfil.bio }}</p>
          <p v-if="perfil.cidade" class="text-xs text-[#6C63FF] font-semibold mt-2">📍 {{ perfil.cidade }}</p>
          <div class="grid grid-cols-3 gap-3 mt-5"><div><b class="block text-lg text-[#211F3B]">{{ perfil.total_conselhos }}</b><small class="text-[10px] uppercase text-[#8e8e8e]">Conselhos</small></div><div><b class="block text-lg text-[#211F3B]">{{ perfil.total_seguidores }}</b><small class="text-[10px] uppercase text-[#8e8e8e]">Seguidores</small></div><div><b class="block text-lg text-[#211F3B]">{{ perfil.total_seguindo }}</b><small class="text-[10px] uppercase text-[#8e8e8e]">Seguindo</small></div></div>
          <div v-if="perfil.usuario !== usuarioLogado" class="grid grid-cols-2 gap-2 mt-6"><button @click="solicitarChat" :disabled="enviandoConvite || conviteEnviado" class="py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#ff6b9d] to-[#f43f5e] disabled:opacity-60">{{ enviandoConvite ? 'Enviando...' : (conviteEnviado ? '✓ Convite enviado' : '💬 Bater papo') }}</button><button @click="alternarSeguir" :disabled="processando" class="py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#6C63FF] to-[#FF6B9D] disabled:opacity-60">{{ processando ? 'Aguarde...' : (seguindo ? '✓ Seguindo' : 'Seguir') }}</button></div>
        </div>
      </template>
    </div>
  </div>
</template>
