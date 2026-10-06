<script setup>
import { ref } from 'vue'

const props = defineProps({
  usuarioLogado: { type: String, default: '' }
})

const emit = defineEmits(['toast'])
const processando = ref('')

const API = 'https://meusocial-api.onrender.com'

const irParaPagamento = async (plano, valor) => {
  if (processando.value) return
  processando.value = plano

  try {
    const res = await fetch(`${API}/api/pagamentos/preferencia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano, valor, usuario: props.usuarioLogado })
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok || !data.sucesso || !data.url) {
      throw new Error(data.erro || 'Não foi possível iniciar o pagamento.')
    }

    window.location.assign(data.url)
  } catch (error) {
    emit('toast', error.message || 'Erro ao iniciar o pagamento.', 'error')
  } finally {
    processando.value = ''
  }
}
</script>

<template>
  <div class="pb-8">
    <div class="vip-hero">
      <div class="text-4xl mb-3">✨</div>
      <h2>Desabafa VIP</h2>
      <p>Mais acolhimento para quem gosta de ajudar.</p>
      <div class="vip-pills"><span>🔒 Privacidade</span><span>💜 Apoio</span><span>🚀 Destaque</span></div>
    </div>
    <div class="px-4 space-y-4 py-5">
      <div class="bg-white border border-[#e9e5f7] rounded-3xl p-5 shadow-sm relative overflow-hidden">
        <div class="absolute top-0 right-0 bg-[#FF6B9D] text-white text-[10px] font-black px-3 py-1.5 rounded-bl-xl">POR 24H</div>
        <div class="text-3xl mb-2">🔥</div>
        <h3 class="text-lg font-black text-[#211F3B]">Destaque 24h</h3>
        <p class="text-sm text-[#77748B] mb-4">Seu desabafo aparece no topo para receber mais apoio.</p>
        <div class="text-2xl font-black text-[#FF6B9D] mb-4">R$ 5,00 <span class="text-sm font-normal text-[#77748B]">/único</span></div>
        <button :disabled="!!processando" @click="irParaPagamento('Destaque', 5)" class="w-full bg-[#f4f1ff] hover:bg-[#e9e5ff] disabled:opacity-60 text-[#5149c8] font-bold py-3 rounded-xl transition">
          {{ processando === 'Destaque' ? 'Abrindo pagamento...' : 'Destacar meu desabafo' }}
        </button>
      </div>
      <div class="bg-gradient-to-br from-[#211F3B] to-[#403979] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div class="absolute -right-8 -top-10 text-8xl opacity-10">✦</div>
        <div class="relative">
          <div class="inline-block bg-[#FDCB6E] text-[#211F3B] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-3">Mais escolhido</div>
          <h3 class="text-xl font-black">⭐ Assinatura Premium</h3>
          <p class="text-sm text-white/70 mb-5">Para quem quer transformar a comunidade com mais liberdade.</p>
          <ul class="space-y-3 mb-5"><li class="flex gap-2 text-sm"><span class="text-[#FDCB6E]">✓</span> Conselhos ilimitados</li><li class="flex gap-2 text-sm"><span class="text-[#FDCB6E]">✓</span> Selo VIP no perfil</li><li class="flex gap-2 text-sm"><span class="text-[#FDCB6E]">✓</span> Sem anúncios</li><li class="flex gap-2 text-sm"><span class="text-[#FDCB6E]">✓</span> Destaque no ranking</li><li class="flex gap-2 text-sm"><span class="text-[#FDCB6E]">✓</span> Chat anônimo em breve</li></ul>
          <div class="text-3xl font-black text-[#FDCB6E] mb-4">R$ 19,90 <span class="text-sm font-normal text-white/60">/mês</span></div>
          <button :disabled="!!processando" @click="irParaPagamento('Premium', 19.90)" class="w-full bg-gradient-to-r from-[#FDCB6E] to-[#f39c12] hover:scale-[1.02] disabled:opacity-60 text-[#211F3B] font-black py-3.5 rounded-xl shadow-lg transition">
            {{ processando === 'Premium' ? 'Abrindo pagamento...' : 'Quero ser Premium ✨' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>.vip-hero{padding:30px 20px 26px;text-align:center;background:linear-gradient(135deg,#211f3b,#5149c8);color:white}.vip-hero h2{font-size:1.55rem;font-weight:900}.vip-hero p{font-size:.82rem;color:#d9d5f5;margin-top:5px}.vip-pills{display:flex;justify-content:center;flex-wrap:wrap;gap:7px;margin-top:17px}.vip-pills span{font-size:.65rem;font-weight:700;background:#ffffff1c;border:1px solid #ffffff2b;padding:6px 9px;border-radius:999px}</style>
