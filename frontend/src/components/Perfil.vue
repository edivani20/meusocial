<script setup>
import { ref, onMounted } from 'vue'
import MinhasMensagens from './MinhasMensagens.vue'

const props = defineProps({ usuarioLogado: String })
const emit = defineEmits(['logout'])

const nomeExibicao = ref('')
const bio = ref('')
const statusRelacionamento = ref('')
const tempoRelacionamento = ref('')
const fotoPerfil = ref('')
const conselhosDados = ref(0)
const isPremium = ref(false)
const nivel = ref('Aprendiz 🌱')

const modalAberto = ref(false)
const salvando = ref(false)
const mostrarMensagens = ref(false)
const formEdicao = ref({ 
  nome_exibicao: '', 
  bio: '', 
  status_relacionamento: '', 
  tempo_relacionamento: '', 
  novaSenha: '', 
  confirmarSenha: '', 
  foto_perfil: '' 
})
const erroEdicao = ref('')
const inputArquivo = ref(null)

const carregarDadosPerfil = async () => {
  try {
    const fotoLocal = localStorage.getItem('foto_perfil')
    if (fotoLocal) fotoPerfil.value = fotoLocal

    const res = await fetch(`https://meusocial.onrender.com/api/perfil/${props.usuarioLogado}`)
    const data = await res.json()
    if (data.sucesso) {
      nomeExibicao.value = data.nome_exibicao || props.usuarioLogado.split('@')[0]
      bio.value = data.bio || 'Em busca de conselhos...'
      statusRelacionamento.value = data.status_relacionamento || 'Indefinido'
      tempoRelacionamento.value = data.tempo_relacionamento || 'Não informado'
      if (data.foto_perfil) {
        fotoPerfil.value = data.foto_perfil
        localStorage.setItem('foto_perfil', data.foto_perfil)
      }
      conselhosDados.value = data.total_conselhos || 0
      isPremium.value = data.is_premium || false
      
      if (conselhosDados.value >= 50) nivel.value = 'Guru dos Relacionamentos ⭐'
      else if (conselhosDados.value >= 20) nivel.value = 'Mestre do Amor 💖'
      else if (conselhosDados.value >= 5) nivel.value = 'Conselheiro 🤝'
      else nivel.value = 'Aprendiz 🌱'
    }
  } catch (error) {
    console.error('Erro ao buscar perfil', error)
  }
}

const abrirModal = () => {
  formEdicao.value = {
    nome_exibicao: nomeExibicao.value,
    bio: bio.value,
    status_relacionamento: statusRelacionamento.value,
    tempo_relacionamento: tempoRelacionamento.value,
    foto_perfil: fotoPerfil.value,
    novaSenha: '',
    confirmarSenha: ''
  }
  erroEdicao.value = ''
  modalAberto.value = true
}

const acionarUpload = () => inputArquivo.value?.click()

const processarImagem = (event) => {
  const file = event.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    erroEdicao.value = 'A foto é muito grande (máx 2MB).'
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => { formEdicao.value.foto_perfil = e.target.result }
  reader.readAsDataURL(file)
}

const salvarPerfil = async () => {
  erroEdicao.value = ''
  if (formEdicao.value.novaSenha && formEdicao.value.novaSenha !== formEdicao.value.confirmarSenha) {
    erroEdicao.value = 'As senhas não coincidem.'
    return
  }

  salvando.value = true
  try {
    const res = await fetch('https://meusocial.onrender.com/api/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: props.usuarioLogado, ...formEdicao.value })
    })
    const data = await res.json()
    if (data.sucesso) {
      nomeExibicao.value = formEdicao.value.nome_exibicao
      bio.value = formEdicao.value.bio
      statusRelacionamento.value = formEdicao.value.status_relacionamento
      tempoRelacionamento.value = formEdicao.value.tempo_relacionamento
      fotoPerfil.value = formEdicao.value.foto_perfil
      localStorage.setItem('foto_perfil', formEdicao.value.foto_perfil)
      modalAberto.value = false
      await carregarDadosPerfil()
    } else {
      erroEdicao.value = data.erro || 'Erro ao salvar.'
    }
  } catch (err) {
    erroEdicao.value = 'Erro de conexão.'
  } finally {
    salvando.value = false
  }
}

onMounted(carregarDadosPerfil)
</script>

<template>
  <div class="pb-4">
    
    <div class="bg-white border-b border-[#efefef] px-4 py-6">
      
      <div class="flex items-center gap-6">
        <div class="relative flex-shrink-0">
          <div class="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-[#6C63FF] via-[#FF6B9D] to-[#6C63FF] bg-[length:400%_400%] animate-rainbow-border">
            <div class="w-full h-full rounded-full overflow-hidden bg-gradient-to-tr from-[#6C63FF] to-[#FF6B9D] flex items-center justify-center text-2xl font-bold text-white">
              <img v-if="fotoPerfil" :src="fotoPerfil" class="w-full h-full object-cover" />
              <span v-else>{{ usuarioLogado.charAt(0).toUpperCase() }}</span>
            </div>
          </div>
          <div v-if="isPremium" class="absolute -top-1 -right-1 bg-[#FDCB6E] text-[#1A1A2E] text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg border-2 border-white z-10">VIP</div>
        </div>

        <div class="flex-1 grid grid-cols-3 gap-2 text-center">
          <div>
            <div class="text-xl font-bold text-[#1A1A2E]">{{ conselhosDados }}</div>
            <div class="text-[10px] font-semibold text-[#8e8e8e] uppercase tracking-wider">Conselhos</div>
          </div>
          <div>
            <div class="text-xl font-bold text-[#1A1A2E]">0</div>
            <div class="text-[10px] font-semibold text-[#8e8e8e] uppercase tracking-wider">Seguidores</div>
          </div>
          <div>
            <div class="text-xl font-bold text-[#1A1A2E]">0</div>
            <div class="text-[10px] font-semibold text-[#8e8e8e] uppercase tracking-wider">Seguindo</div>
          </div>
        </div>
      </div>

      <div class="mt-4">
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-[#1A1A2E]">{{ nomeExibicao }}</h2>
          <span class="text-xs bg-[#f5f5f5] text-[#6C63FF] px-2 py-0.5 rounded-full font-medium">{{ nivel }}</span>
        </div>
        <p class="text-sm text-[#8e8e8e] mt-0.5">{{ bio }}</p>
        
        <div class="flex flex-wrap gap-2 mt-2">
          <span class="text-xs bg-[#f5f5f5] text-[#6C757D] px-3 py-1 rounded-full font-medium flex items-center gap-1">
            <span class="text-[#6C63FF]">❤️</span> {{ statusRelacionamento }}
          </span>
          <span class="text-xs bg-[#f5f5f5] text-[#6C757D] px-3 py-1 rounded-full font-medium flex items-center gap-1">
            <span class="text-[#6C63FF]">⏱️</span> {{ tempoRelacionamento }}
          </span>
        </div>
      </div>

      <div class="flex gap-2 mt-4">
        <button @click="abrirModal" class="flex-1 bg-[#f5f5f5] hover:bg-[#e9ecef] text-[#1A1A2E] font-semibold text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          Editar Perfil
        </button>
        <button @click="$emit('logout')" class="flex-1 bg-[#fee2e2] hover:bg-[#fecaca] text-[#dc2626] font-semibold text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          Sair
        </button>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3 px-4 py-4">
      <div class="bg-white border border-[#efefef] rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-bold text-[#6C63FF]">5.0</div>
        <div class="text-[#FDCB6E] text-sm">⭐⭐⭐⭐⭐</div>
        <p class="text-[9px] font-semibold text-[#8e8e8e] uppercase tracking-wider mt-1">Média</p>
      </div>
      <div class="bg-white border border-[#efefef] rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-bold text-[#FF6B9D]">{{ conselhosDados }}</div>
        <div class="text-sm">💬</div>
        <p class="text-[9px] font-semibold text-[#8e8e8e] uppercase tracking-wider mt-1">Conselhos</p>
      </div>
      <div class="bg-white border border-[#efefef] rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-bold text-[#FDCB6E]">{{ isPremium ? '⭐' : '🚀' }}</div>
        <div class="text-sm">{{ isPremium ? 'VIP' : 'Grátis' }}</div>
        <p class="text-[9px] font-semibold text-[#8e8e8e] uppercase tracking-wider mt-1">Plano</p>
      </div>
    </div>

    <div class="px-4 space-y-3">
      <button 
        @click="mostrarMensagens = true"
        class="w-full bg-gradient-to-r from-[#6C63FF] to-[#FF6B9D] hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#6C63FF]/20"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        💬 Minhas Mensagens
      </button>
    </div>

    <MinhasMensagens 
      v-if="mostrarMensagens"
      :usuarioLogado="usuarioLogado"
      @fechar="mostrarMensagens = false"
    />

    <div v-if="modalAberto" class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        <button @click="modalAberto = false" class="absolute top-4 right-4 text-[#8e8e8e] hover:text-[#1A1A2E]">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <h3 class="text-xl font-bold text-[#1A1A2E] mb-6 text-center">✏️ Editar Perfil</h3>

        <div class="flex flex-col items-center mb-6">
          <div @click="acionarUpload" class="relative w-24 h-24 rounded-full border-4 border-[#6C63FF] overflow-hidden cursor-pointer group bg-[#f8f9fa] flex items-center justify-center">
            <img v-if="formEdicao.foto_perfil" :src="formEdicao.foto_perfil" class="w-full h-full object-cover" />
            <span v-else class="text-3xl font-bold text-[#adb5bd]">{{ usuarioLogado.charAt(0).toUpperCase() }}</span>
            <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
          </div>
          <input type="file" ref="inputArquivo" accept="image/*" class="hidden" @change="processarImagem" />
          <p class="text-[10px] text-[#8e8e8e] mt-2">Clique na foto para alterar</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-1.5">Nome de Exibição</label>
            <input type="text" v-model="formEdicao.nome_exibicao" placeholder="Como quer ser chamado" class="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3 text-sm text-[#1A1A2E] focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-1.5">Bio</label>
            <textarea v-model="formEdicao.bio" rows="2" placeholder="Fale sobre sua situação..." class="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3 text-sm text-[#1A1A2E] focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all resize-none"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-1.5">Status</label>
              <select v-model="formEdicao.status_relacionamento" class="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-3 py-3 text-sm text-[#1A1A2E] focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all">
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Namorando">Namorando</option>
                <option value="Noivo(a)">Noivo(a)</option>
                <option value="Casados">Casados</option>
                <option value="Com Dúvidas">Com Dúvidas</option>
                <option value="Em Crise">Em Crise</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-1.5">Tempo</label>
              <input type="text" v-model="formEdicao.tempo_relacionamento" placeholder="Ex: 3 anos" class="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3 text-sm text-[#1A1A2E] focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-1.5">Nova Senha <span class="font-normal text-[#adb5bd]">(opcional)</span></label>
            <input type="password" v-model="formEdicao.novaSenha" placeholder="Deixe em branco para não alterar" class="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3 text-sm text-[#1A1A2E] focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all" />
          </div>

          <div v-if="formEdicao.novaSenha">
            <label class="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-1.5">Confirmar Senha</label>
            <input type="password" v-model="formEdicao.confirmarSenha" placeholder="Digite novamente a senha" class="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3 text-sm text-[#1A1A2E] focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all" />
          </div>

          <div v-if="erroEdicao" class="bg-[#fee2e2] border border-[#fecaca] text-[#dc2626] text-xs p-3 rounded-lg text-center">{{ erroEdicao }}</div>

          <button @click="salvarPerfil" :disabled="salvando" class="w-full bg-gradient-to-r from-[#6C63FF] to-[#FF6B9D] hover:opacity-90 active:scale-[0.98] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#6C63FF]/30 transition-all duration-200">
            {{ salvando ? 'Salvando...' : '💾 Salvar Alterações' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes rainbowBorder {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.animate-rainbow-border {
  animation: rainbowBorder 4s ease infinite;
}
</style>