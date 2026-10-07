<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({ usuarioLogado: String })
const emit = defineEmits(['abrir-perfil', 'abrir-chat'])
const cidade = ref('')
const distancia = ref('')
const pessoas = ref([])
const carregando = ref(false)
const erro = ref('')
const usandoLocalizacao = ref(false)

const buscar = async () => {
  carregando.value = true
  erro.value = ''
  try {
    const params = new URLSearchParams({ usuario: props.usuarioLogado, cidade: cidade.value, distancia: distancia.value || '0' })
    const res = await fetch(`https://meusocial-api.onrender.com/api/descobrir?${params}`)
    const data = await res.json()
    if (!data.sucesso) throw new Error(data.erro || 'Não foi possível buscar pessoas.')
    pessoas.value = data.pessoas || []
    usandoLocalizacao.value = data.usando_localizacao
  } catch (e) {
    erro.value = e.message
  } finally {
    carregando.value = false
  }
}

onMounted(buscar)
</script>

<template>
  <section class="space-y-4 p-4 sm:p-0">
    <div class="bg-gradient-to-r from-[#5149c8] to-[#ff6b9d] rounded-3xl p-6 text-white shadow-lg">
      <p class="text-xs uppercase tracking-widest font-bold text-white/75">Conexões reais</p>
      <h2 class="text-2xl font-black mt-1">Pessoas perto de você</h2>
      <p class="text-sm text-white/85 mt-2">Encontre pessoas da sua cidade para trocar apoio e experiências.</p>
    </div>

    <div class="bg-white rounded-2xl border border-[#efefef] p-4 shadow-sm">
      <div class="grid sm:grid-cols-[1fr_150px_auto] gap-3">
        <input v-model="cidade" @keyup.enter="buscar" placeholder="Filtrar por cidade (ex.: Recife)" class="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6C63FF]" />
        <select v-model="distancia" class="bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#6C63FF]">
          <option value="">Qualquer distância</option>
          <option value="5">Até 5 km</option>
          <option value="10">Até 10 km</option>
          <option value="25">Até 25 km</option>
          <option value="50">Até 50 km</option>
          <option value="100">Até 100 km</option>
        </select>
        <button @click="buscar" class="bg-[#6C63FF] text-white font-bold rounded-xl px-5 py-3 hover:opacity-90">Buscar</button>
      </div>
      <p class="text-[11px] text-[#8e8e8e] mt-3">A distância só aparece quando os usuários autorizam a localização aproximada no perfil. A cidade é sempre opcional e pode ficar em branco.</p>
      <p v-if="distancia && !usandoLocalizacao" class="text-xs text-[#b45309] mt-2">Para filtrar por quilômetros, ative sua localização aproximada em Editar Perfil.</p>
    </div>

    <div v-if="erro" class="bg-red-50 text-red-600 rounded-xl p-4 text-sm">{{ erro }}</div>
    <div v-if="carregando" class="text-center py-12 text-[#8e8e8e]">Buscando pessoas...</div>
    <div v-else-if="!pessoas.length" class="bg-white rounded-2xl border border-[#efefef] text-center py-12 px-6">
      <div class="text-4xl mb-3">🧭</div><p class="font-bold text-[#1A1A2E]">Nenhuma pessoa encontrada</p><p class="text-sm text-[#8e8e8e] mt-1">Tente outra cidade ou aumente o raio de busca.</p>
    </div>
    <div v-else class="grid sm:grid-cols-2 gap-3">
      <article v-for="pessoa in pessoas" :key="pessoa.usuario" class="bg-white rounded-2xl border border-[#efefef] p-4 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-[#6C63FF] to-[#FF6B9D] flex items-center justify-center text-white font-bold"><img v-if="pessoa.foto_perfil" :src="pessoa.foto_perfil" class="w-full h-full object-cover" /><span v-else>{{ (pessoa.nome_exibicao || pessoa.usuario).charAt(0).toUpperCase() }}</span></div>
          <div class="min-w-0 flex-1"><p class="font-bold text-[#1A1A2E] truncate">{{ pessoa.nome_exibicao || pessoa.usuario }}</p><p class="text-xs text-[#8e8e8e] truncate">📍 {{ pessoa.cidade }} <span v-if="pessoa.distancia_km !== null">· {{ pessoa.distancia_km }} km</span></p></div>
          <span v-if="pessoa.is_online" class="w-2.5 h-2.5 rounded-full bg-green-500" title="Online"></span>
        </div>
        <p class="text-xs text-[#6C757D] mt-3 line-clamp-2">{{ pessoa.bio || 'Ainda não adicionou uma bio.' }}</p>
        <div class="flex gap-2 mt-4"><button @click="emit('abrir-perfil', pessoa.usuario)" class="flex-1 py-2 rounded-lg bg-[#f0edff] text-[#5149c8] text-xs font-bold">Ver perfil</button><button @click="emit('abrir-chat', pessoa.usuario)" class="flex-1 py-2 rounded-lg bg-[#fff0f5] text-[#d94678] text-xs font-bold">💬 Conversar</button></div>
      </article>
    </div>
  </section>
</template>
