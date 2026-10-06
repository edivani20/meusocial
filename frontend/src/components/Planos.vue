<script setup>
import { ref } from 'vue'

const props = defineProps({ usuarioLogado: { type: String, default: '' } })
const emit = defineEmits(['toast'])
const processando = ref('')
const pix = ref(null)
const API = 'https://meusocial-api.onrender.com'

const gerarPix = async (plano) => {
  if (processando.value) return
  processando.value = plano
  pix.value = null
  try {
    const res = await fetch(`${API}/api/pagamentos/pix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano, usuario: props.usuarioLogado })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.sucesso || !data.qr_code) throw new Error(data.erro || 'Não foi possível gerar o Pix.')
    pix.value = { ...data, plano }
  } catch (error) {
    emit('toast', error.message || 'Erro ao gerar o Pix.', 'error')
  } finally {
    processando.value = ''
  }
}

const fecharPix = () => { pix.value = null }

const copiarPix = async () => {
  if (!pix.value?.qr_code) return
  try {
    await navigator.clipboard.writeText(pix.value.qr_code)
    emit('toast', 'Código Pix copiado!', 'success')
  } catch {
    emit('toast', 'Selecione e copie o código Pix manualmente.', 'info')
  }
}
</script>

<template>
  <div class="pb-8">
    <div class="vip-hero"><div class="text-4xl mb-3">✨</div><h2>Desabafa VIP</h2><p>Mais acolhimento para quem gosta de ajudar.</p><div class="vip-pills"><span>🔒 Privacidade</span><span>💜 Apoio</span><span>🚀 Destaque</span></div></div>
    <div class="px-4 space-y-4 py-5">
      <div class="bg-white border border-[#e9e5f7] rounded-3xl p-5 shadow-sm relative overflow-hidden">
        <div class="absolute top-0 right-0 bg-[#FF6B9D] text-white text-[10px] font-black px-3 py-1.5 rounded-bl-xl">POR 24H</div><div class="text-3xl mb-2">🔥</div><h3 class="text-lg font-black text-[#211F3B]">Destaque 24h</h3><p class="text-sm text-[#77748B] mb-4">Seu desabafo aparece no topo para receber mais apoio.</p><div class="text-2xl font-black text-[#FF6B9D] mb-4">R$ 5,00 <span class="text-sm font-normal text-[#77748B]">/único</span></div>
        <button :disabled="!!processando" @click="gerarPix('Destaque')" class="w-full bg-[#f4f1ff] hover:bg-[#e9e5ff] disabled:opacity-60 text-[#5149c8] font-bold py-3 rounded-xl transition">{{ processando === 'Destaque' ? 'Gerando Pix...' : 'Pagar com Pix' }}</button>
      </div>
      <div class="bg-gradient-to-br from-[#211F3B] to-[#403979] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden"><div class="absolute -right-8 -top-10 text-8xl opacity-10">✦</div><div class="relative"><div class="inline-block bg-[#FDCB6E] text-[#211F3B] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-3">Mais escolhido</div><h3 class="text-xl font-black">⭐ Assinatura Premium</h3><p class="text-sm text-white/70 mb-5">Para quem quer transformar a comunidade com mais liberdade.</p><ul class="space-y-3 mb-5"><li class="flex gap-2 text-sm"><span class="text-[#FDCB6E]">✓</span> Conselhos ilimitados</li><li class="flex gap-2 text-sm"><span class="text-[#FDCB6E]">✓</span> Selo VIP no perfil</li><li class="flex gap-2 text-sm"><span class="text-[#FDCB6E]">✓</span> Sem anúncios</li><li class="flex gap-2 text-sm"><span class="text-[#FDCB6E]">✓</span> Destaque no ranking</li><li class="flex gap-2 text-sm"><span class="text-[#FDCB6E]">✓</span> Chat anônimo em breve</li></ul><div class="text-3xl font-black text-[#FDCB6E] mb-4">R$ 19,90 <span class="text-sm font-normal text-white/60">/mês</span></div><button :disabled="!!processando" @click="gerarPix('Premium')" class="w-full bg-gradient-to-r from-[#FDCB6E] to-[#f39c12] hover:scale-[1.02] disabled:opacity-60 text-[#211F3B] font-black py-3.5 rounded-xl shadow-lg transition">{{ processando === 'Premium' ? 'Gerando Pix...' : 'Pagar com Pix' }}</button></div></div>
    </div>

    <Teleport to="body">
      <div v-if="pix" class="pix-overlay" @click.self="fecharPix">
        <div class="pix-modal" role="dialog" aria-modal="true" aria-labelledby="pix-title">
          <button class="pix-close" type="button" aria-label="Fechar Pix" @click="fecharPix">×</button>
          <div class="pix-modal-header"><div class="pix-logo">◆</div><div><h3 id="pix-title">Pague com Pix</h3><p>{{ pix.plano === 'Premium' ? 'Desabafa Premium — R$ 19,90' : 'Destaque 24h — R$ 5,00' }}</p></div></div>
          <div class="pix-divider"></div>
          <p class="pix-instruction">Escaneie o QR Code com o aplicativo do seu banco ou copie o código Pix.</p>
          <img v-if="pix.qr_code_base64" :src="`data:image/png;base64,${pix.qr_code_base64}`" alt="QR Code Pix" class="pix-qr">
          <textarea readonly :value="pix.qr_code" class="pix-code" rows="4" aria-label="Código Pix copia e cola"></textarea>
          <button @click="copiarPix" class="pix-copy">Copiar código Pix</button>
          <a v-if="pix.ticket_url" :href="pix.ticket_url" target="_blank" rel="noopener" class="pix-ticket">Abrir instruções do Pix</a>
          <button type="button" @click="fecharPix" class="pix-later">Fechar</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
.vip-hero{padding:30px 20px 26px;text-align:center;background:linear-gradient(135deg,#211f3b,#5149c8);color:white}.vip-hero h2{font-size:1.55rem;font-weight:900}.vip-hero p{font-size:.82rem;color:#d9d5f5;margin-top:5px}.vip-pills{display:flex;justify-content:center;flex-wrap:wrap;gap:7px;margin-top:17px}.vip-pills span{font-size:.65rem;font-weight:700;background:#ffffff1c;border:1px solid #ffffff2b;padding:6px 9px;border-radius:999px}
.pix-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(20,16,42,.72);backdrop-filter:blur(4px);overflow-y:auto}.pix-modal{position:relative;width:min(100%,430px);max-height:calc(100vh - 36px);overflow-y:auto;background:#fff;border-radius:26px;padding:24px 22px 20px;box-shadow:0 24px 80px rgba(0,0,0,.35);animation:pix-in .2s ease}.pix-close{position:absolute;right:15px;top:10px;border:0;background:transparent;color:#777;font-size:30px;line-height:1;cursor:pointer}.pix-modal-header{display:flex;align-items:center;gap:12px;padding-right:28px}.pix-logo{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;color:#fff;background:linear-gradient(135deg,#5149c8,#ff6b9d);font-size:18px}.pix-modal h3{margin:0;color:#211f3b;font-size:21px;font-weight:900}.pix-modal-header p{margin:3px 0 0;color:#77748b;font-size:13px}.pix-divider{height:1px;background:#eeeaf7;margin:17px 0}.pix-instruction{margin:0;text-align:center;color:#5f5b70;font-size:13px;line-height:1.45}.pix-qr{display:block;width:220px;height:220px;object-fit:contain;margin:14px auto 15px}.pix-code{display:block;width:100%;resize:none;box-sizing:border-box;border:1px solid #ded9ee;border-radius:12px;padding:10px;font-size:11px;line-height:1.35;background:#faf9ff;color:#333}.pix-copy{width:100%;margin-top:10px;border:0;border-radius:12px;padding:13px;background:#5149c8;color:#fff;font-weight:800;cursor:pointer}.pix-ticket{display:block;text-align:center;margin-top:13px;color:#5149c8;font-size:13px;font-weight:700}.pix-later{display:block;width:100%;margin-top:13px;border:0;background:transparent;color:#77748b;font-size:13px;cursor:pointer}.pix-copy:hover{background:#4039a8}@keyframes pix-in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
</style>
