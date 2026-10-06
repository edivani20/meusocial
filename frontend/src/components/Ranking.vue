<script setup>
import { ref, onMounted } from 'vue'

const topConselheiros = ref([])
const carregando = ref(true)

onMounted(async () => {
  carregando.value = true
  try {
    const res = await fetch('https://meusocial-api.onrender.com/api/ranking')
    const data = await res.json()
    if (data.sucesso) topConselheiros.value = data.ranking
  } catch (error) {
    console.error('Erro ao carregar ranking:', error)
  } finally {
    carregando.value = false
  }
})
</script>

<template>
  <div class="pb-4">
    <div class="bg-white border-b border-[#efefef] px-4 py-4 text-center">
      <h2 class="text-xl font-bold text-[#1A1A2E]">🏆 Hall da Fama</h2>
      <p class="text-sm text-[#8e8e8e]">Os melhores conselheiros da comunidade</p>
    </div>

    <div v-if="carregando" class="text-center py-10">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#6C63FF] border-t-transparent"></div>
    </div>

    <div v-else-if="topConselheiros.length === 0" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto text-[#e9ecef]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      <p class="text-[#8e8e8e] mt-2">Nenhum conselheiro ainda. Seja o primeiro!</p>
    </div>

    <div v-else class="px-4 space-y-3 py-4">
      <div 
        v-for="(user, index) in topConselheiros" 
        :key="user.id" 
        class="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm"
        :class="{
          'border-[#FDCB6E] shadow-[#FDCB6E]/10': index === 0,
          'border-[#bdc3c7]': index === 1,
          'border-[#e67e22]': index === 2
        }"
      >
        <div class="flex items-center gap-4">
          <div 
            class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden"
            :class="{
              'bg-gradient-to-tr from-[#FDCB6E] to-[#f39c12] text-[#1A1A2E]': index === 0,
              'bg-gradient-to-tr from-[#bdc3c7] to-[#95a5a6] text-[#1A1A2E]': index === 1,
              'bg-gradient-to-tr from-[#e67e22] to-[#d35400] text-white': index === 2,
              'bg-[#f5f5f5] text-[#6C757D]': index > 2
            }"
          >
            <img v-if="user.foto" :src="user.foto" class="w-full h-full object-cover" />
            <span v-else>#{{ index + 1 }}</span>
          </div>
          <div>
            <h3 class="font-bold text-sm text-[#1A1A2E]">{{ user.nome }}</h3>
            <p class="text-xs text-[#6C63FF] font-medium">{{ user.nivel }}</p>
          </div>
        </div>
        <div class="text-right">
          <div class="text-lg font-bold text-[#1A1A2E]">{{ user.estrelas }} <span class="text-[#FDCB6E]">⭐</span></div>
          <p class="text-xs text-[#8e8e8e]">{{ user.conselhos }} conselhos</p>
        </div>
      </div>
    </div>
  </div>
</template>