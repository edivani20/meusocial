<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({ usuarioLogado: String })
const emit = defineEmits(['abrir-perfil', 'abrir-chat'])
const cidade = ref('')
const distancia = ref('')
const pessoas = ref([])
const carregando = ref(false)
const ativandoLocalizacao = ref(false)
const erro = ref('')
const aviso = ref('')
const usandoLocalizacao = ref(false)
const latitude = ref(null)
const longitude = ref(null)
const cidadeSalva = ref(false)
const salvandoCidade = ref(false)

const buscar = async () => {
  carregando.value = true
  erro.value = ''
  try {
    const params = new URLSearchParams({ usuario: props.usuarioLogado, cidade: cidade.value, distancia: distancia.value || '0' })
    if (latitude.value !== null && longitude.value !== null) {
      params.set('latitude', latitude.value)
      params.set('longitude', longitude.value)
    }
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

const salvarCoordenadas = async (lat, lon, cidadeDetectada = '', origem = 'GPS') => {
  const res = await fetch('https://meusocial-api.onrender.com/api/perfil/localizacao', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario: props.usuarioLogado, latitude: lat, longitude: lon })
  })
  const data = await res.json()
  if (!res.ok || !data.sucesso) throw new Error(data.erro || 'Não foi possível salvar a localização.')
  latitude.value = lat
  longitude.value = lon
  usandoLocalizacao.value = true
  if (cidadeDetectada && !cidadeSalva.value) {
    cidade.value = cidadeDetectada
    await fetch('https://meusocial-api.onrender.com/api/perfil/cidade', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: props.usuarioLogado, cidade: cidadeDetectada })
    }).catch(() => {})
    cidadeSalva.value = true
  }
  aviso.value = `Localização por ${origem} ativada${cidadeDetectada ? `: ${cidadeDetectada}` : ''}.`
  await buscar()
}

const localizarPorIp = async () => {
  const res = await fetch('https://ipapi.co/json/')
  const data = await res.json()
  if (!Number.isFinite(Number(data.latitude)) || !Number.isFinite(Number(data.longitude))) throw new Error('Não foi possível localizar pelo IP.')
  const cidadeIp = [data.city, data.region_code].filter(Boolean).join(' - ')
  await salvarCoordenadas(Number(data.latitude), Number(data.longitude), cidadeIp, 'IP')
}

const ativarLocalizacao = () => {
  erro.value = ''
  aviso.value = ''
  ativandoLocalizacao.value = true
  const usarIp = async () => {
    try { await localizarPorIp() }
    catch (e) { erro.value = 'Não foi possível obter sua localização por GPS nem por IP.' }
    finally { ativandoLocalizacao.value = false }
  }
  if (!navigator.geolocation || !window.isSecureContext) return usarIp()
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      let cidadeGps = ''
      try {
        const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=pt-BR`).then(r => r.json())
        cidadeGps = [geo.address?.city || geo.address?.town || geo.address?.municipality, geo.address?.state].filter(Boolean).join(' - ')
      } catch (e) {}
      await salvarCoordenadas(pos.coords.latitude, pos.coords.longitude, cidadeGps, 'GPS')
    } catch (e) { erro.value = e.message }
    finally { ativandoLocalizacao.value = false }
  }, usarIp, { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 })
}

const salvarCidade = async () => {
  if (!cidade.value.trim() || salvandoCidade.value) return
  salvandoCidade.value = true
  erro.value = ''
  try {
    const res = await fetch('https://meusocial-api.onrender.com/api/perfil/cidade', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: props.usuarioLogado, cidade: cidade.value })
    })
    const data = await res.json()
    if (!res.ok || !data.sucesso) throw new Error(data.erro || 'Não foi possível salvar a cidade.')
    cidadeSalva.value = true
    aviso.value = 'Cidade salva. Agora você também poderá encontrar pessoas da mesma região.'
    await buscar()
  } catch (e) { erro.value = e.message }
  finally { salvandoCidade.value = false }
}

const carregarLocalizacaoSalva = async () => {
  try {
    const res = await fetch(`https://meusocial-api.onrender.com/api/perfil/${encodeURIComponent(props.usuarioLogado)}`)
    const data = await res.json()
    if (data.sucesso && data.cidade) {
      cidade.value = data.cidade
      cidadeSalva.value = true
    }
    if (data.sucesso && Number.isFinite(Number(data.latitude)) && Number.isFinite(Number(data.longitude))) {
      latitude.value = Number(data.latitude)
      longitude.value = Number(data.longitude)
      usandoLocalizacao.value = true
    }
  } catch (e) {}
}

const sincronizarLocalizacaoAutorizada = async () => {
  if (!navigator.geolocation || !window.isSecureContext) return
  try {
    const permissao = navigator.permissions?.query ? await navigator.permissions.query({ name: 'geolocation' }) : null
    if (permissao && permissao.state !== 'granted') return
    await new Promise(resolve => navigator.geolocation.getCurrentPosition(async pos => {
      latitude.value = pos.coords.latitude
      longitude.value = pos.coords.longitude
      usandoLocalizacao.value = true
      await fetch('https://meusocial-api.onrender.com/api/perfil/localizacao', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: props.usuarioLogado, latitude: pos.coords.latitude, longitude: pos.coords.longitude })
      }).catch(() => {})
      resolve()
    }, () => resolve(), { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }))
  } catch (e) {}
}

onMounted(async () => {
  await carregarLocalizacaoSalva()
  await sincronizarLocalizacaoAutorizada()
  await buscar()
})
</script>

<template>
  <section class="space-y-4 p-4 sm:p-0">
    <div class="bg-gradient-to-r from-[#5149c8] to-[#ff6b9d] rounded-3xl p-6 text-white shadow-lg">
      <p class="text-xs uppercase tracking-widest font-bold text-white/75">Conexões reais</p>
      <h2 class="text-2xl font-black mt-1">Pessoas perto de você</h2>
      <p class="text-sm text-white/85 mt-2">Encontre pessoas da sua cidade e veja quem está mais próximo.</p>
    </div>

    <div class="bg-white rounded-2xl border border-[#efefef] p-4 shadow-sm">
      <div v-if="!usandoLocalizacao" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-[#f7f5ff] border border-[#e9e5ff] mb-4">
        <div class="flex-1"><p class="font-bold text-sm text-[#1A1A2E]">Complete sua localização (opcional)</p><p class="text-xs text-[#6C757D] mt-1">Você pode informar sua cidade ou permitir a localização aproximada. Não é necessário fazer outro cadastro.</p><div class="flex gap-2 mt-3"><input v-model="cidade" placeholder="Cidade onde mora" class="min-w-0 flex-1 bg-white border border-[#e9e5ff] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#6C63FF]" /><button v-if="!cidadeSalva" @click="salvarCidade" :disabled="salvandoCidade || !cidade.trim()" class="rounded-lg px-3 py-2 text-xs font-bold text-[#5149c8] bg-white border border-[#dcd6ff] disabled:opacity-50">{{ salvandoCidade ? 'Salvando...' : 'Salvar cidade' }}</button></div></div>
        <button @click="ativarLocalizacao" :disabled="ativandoLocalizacao || usandoLocalizacao" class="shrink-0 rounded-xl px-4 py-3 text-xs font-bold text-white bg-[#6C63FF] hover:opacity-90 disabled:opacity-60">{{ ativandoLocalizacao ? 'Aguardando permissão...' : (usandoLocalizacao ? '✓ Localização ativa' : 'Ativar localização') }}</button>
      </div>
      <div class="grid sm:grid-cols-[1fr_150px_auto] gap-3">
        <input v-model="cidade" @keyup.enter="buscar" placeholder="Filtrar por cidade (ex.: Recife)" class="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6C63FF]" />
        <select v-model="distancia" class="bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#6C63FF]"><option value="">Qualquer distância</option><option value="5">Até 5 km</option><option value="10">Até 10 km</option><option value="25">Até 25 km</option><option value="50">Até 50 km</option><option value="100">Até 100 km</option></select>
        <button @click="buscar" class="bg-[#6C63FF] text-white font-bold rounded-xl px-5 py-3 hover:opacity-90">Buscar</button>
      </div>
      <p class="text-[11px] text-[#8e8e8e] mt-3">Para aparecer nesta lista, a pessoa precisa informar a cidade ou permitir a localização. Para calcular quilômetros, cada pessoa precisa permitir a localização.</p>
      <p v-if="distancia && !usandoLocalizacao" class="text-xs text-[#b45309] mt-2">Ative sua localização acima para usar o filtro por quilômetros.</p>
    </div>

    <div v-if="aviso" class="bg-green-50 border border-green-100 text-green-700 rounded-xl p-4 text-sm">{{ aviso }}</div>
    <div v-if="erro" class="bg-red-50 border border-red-100 text-red-600 rounded-xl p-4 text-sm">{{ erro }}</div>
    <div v-if="carregando" class="text-center py-12 text-[#8e8e8e]">Buscando pessoas...</div>
    <div v-else-if="!pessoas.length" class="bg-white rounded-2xl border border-[#efefef] text-center py-12 px-6"><div class="text-4xl mb-3">🧭</div><p class="font-bold text-[#1A1A2E]">Nenhuma pessoa encontrada</p><p class="text-sm text-[#8e8e8e] mt-1">Tente outra cidade ou aumente o raio de busca.</p></div>
    <div v-else class="grid sm:grid-cols-2 gap-3">
      <article v-for="pessoa in pessoas" :key="pessoa.usuario" class="bg-white rounded-2xl border border-[#efefef] p-4 shadow-sm"><div class="flex items-center gap-3"><div class="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-[#6C63FF] to-[#FF6B9D] flex items-center justify-center text-white font-bold"><img v-if="pessoa.foto_perfil" :src="pessoa.foto_perfil" class="w-full h-full object-cover" /><span v-else>{{ (pessoa.nome_exibicao || pessoa.usuario).charAt(0).toUpperCase() }}</span></div><div class="min-w-0 flex-1"><p class="font-bold text-[#1A1A2E] truncate">{{ pessoa.nome_exibicao || pessoa.usuario }}</p><p class="text-xs text-[#8e8e8e] truncate">📍 {{ pessoa.cidade || 'Localização ativada' }} <span v-if="pessoa.distancia_km !== null">· {{ pessoa.distancia_km }} km</span></p></div><span v-if="pessoa.is_online" class="w-2.5 h-2.5 rounded-full bg-green-500" title="Online"></span></div><p class="text-xs text-[#6C757D] mt-3 line-clamp-2">{{ pessoa.bio || 'Ainda não adicionou uma bio.' }}</p><div class="flex gap-2 mt-4"><button @click="emit('abrir-perfil', pessoa.usuario)" class="flex-1 py-2 rounded-lg bg-[#f0edff] text-[#5149c8] text-xs font-bold">Ver perfil</button><button @click="emit('abrir-chat', pessoa.usuario)" class="flex-1 py-2 rounded-lg bg-[#fff0f5] text-[#d94678] text-xs font-bold">💬 Conversar</button></div></article>
    </div>
  </section>
</template>
