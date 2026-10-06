<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const usuariosOnline = ref([])
const totalOnline = ref(0)
const carregando = ref(true)
let intervalo = null

const carregarOnline = async () => {
  try {
    const res = await fetch('https://meusocial.onrender.com/api/usuarios-online')
    const data = await res.json()
    if (data.sucesso) {
      usuariosOnline.value = data.online
      totalOnline.value = data.total
    }
  } catch (error) {
    console.error('Erro ao carregar usuários online:', error)
  } finally {
    carregando.value = false
  }
}

onMounted(() => {
  carregarOnline()
  intervalo = setInterval(carregarOnline, 10000)
})

onUnmounted(() => {
  if (intervalo) clearInterval(intervalo)
})
</script>

<template>
  <div class="bg-white border-b border-[#efefef] px-4 py-3">
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1">
        <span class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span class="text-sm font-semibold text-[#1A1A2E]">{{ totalOnline }} online</span>
      </div>
      
      <div class="flex-1 flex overflow-hidden">
        <div v-if="carregando" class="text-xs text-[#8e8e8e]">Carregando...</div>
        <div v-else class="flex -space-x-2">
          <div 
            v-for="(user, index) in usuariosOnline.slice(0, 8)" 
            :key="user.usuario"
            class="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-[#f5f5f5] flex items-center justify-center text-[10px] font-bold text-[#6C63FF]"
            :title="user.nome_exibicao || user.usuario"
          >
            <img v-if="user.foto_perfil" :src="user.foto_perfil" class="w-full h-full object-cover" />
            <span v-else>{{ (user.nome_exibicao || user.usuario).charAt(0).toUpperCase() }}</span>
          </div>
          <div v-if="usuariosOnline.length > 8" class="w-8 h-8 rounded-full border-2 border-white bg-[#f5f5f5] flex items-center justify-center text-[10px] font-bold text-[#6C757D]">
            +{{ usuariosOnline.length - 8 }}
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="usuariosOnline.length > 0" class="mt-2 flex flex-wrap gap-1">
      <span 
        v-for="user in usuariosOnline.slice(0, 15)" 
        :key="user.usuario"
        class="text-[10px] bg-[#f5f5f5] text-[#6C757D] px-2 py-0.5 rounded-full flex items-center gap-1"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
        {{ user.nome_exibicao || user.usuario.split('@')[0] }}
      </span>
      <span v-if="usuariosOnline.length > 15" class="text-[10px] text-[#8e8e8e]">
        +{{ usuariosOnline.length - 15 }} outros
      </span>
    </div>
  </div>
</template>