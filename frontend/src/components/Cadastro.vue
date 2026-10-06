<script setup>
import { ref } from 'vue'

const emit = defineEmits(['cadastro-sucesso', 'ir-para-login'])

const form = ref({ usuario: '', senha: '', confirmarSenha: '' })
const erro = ref('')
const sucesso = ref('')
const carregando = ref(false)

const lidarCadastro = async () => {
  erro.value = ''
  sucesso.value = ''

  if (!form.value.usuario || !form.value.senha || !form.value.confirmarSenha) {
    erro.value = 'Preencha todos os campos.'
    return
  }

  if (form.value.senha !== form.value.confirmarSenha) {
    erro.value = 'As senhas não coincidem.'
    return
  }

  carregando.value = true

  try {
    const res = await fetch('https://meusocial-api.onrender.com/api/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: form.value.usuario, senha: form.value.senha })
    })
    const data = await res.json()

    if (data.sucesso) {
      sucesso.value = 'Bem-vindo! Conta criada com sucesso...'
      setTimeout(() => emit('cadastro-sucesso'), 1500)
    } else {
      erro.value = data.erro || 'Erro ao criar conta.'
    }
  } catch (err) {
    erro.value = 'Erro de conexão com o servidor.'
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-[#6C63FF] to-[#FF6B9D] flex items-center justify-center p-4 relative overflow-hidden">
    
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-[100px]"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-[100px]"></div>
    </div>

    <div class="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl shadow-[#6C63FF]/30 z-10">
      
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-[#6C63FF] to-[#FF6B9D] rounded-2xl shadow-lg shadow-[#6C63FF]/30 text-white mb-4">
          <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            <path d="M16 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-1.16 0-2.92.35-4.5.95C12.44 15.65 13 16.77 13 18v2h9v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <h2 class="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">Junte-se a Nós</h2>
        <p class="text-sm text-[#6C757D] mt-1">A maior comunidade de conselhos reais</p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-1.5">E-mail ou Usuário</label>
          <input type="text" v-model="form.usuario" placeholder="seu@email.com" class="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3.5 text-sm text-[#1A1A2E] placeholder-[#adb5bd] focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-1.5">Senha</label>
          <input type="password" v-model="form.senha" placeholder="••••••••" class="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3.5 text-sm text-[#1A1A2E] placeholder-[#adb5bd] focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-1.5">Confirmar Senha</label>
          <input type="password" v-model="form.confirmarSenha" placeholder="••••••••" class="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3.5 text-sm text-[#1A1A2E] placeholder-[#adb5bd] focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all" />
        </div>

        <div v-if="erro" class="bg-[#fee2e2] border border-[#fecaca] text-[#dc2626] text-xs p-3.5 rounded-xl text-center font-medium">{{ erro }}</div>
        <div v-if="sucesso" class="bg-[#dcfce7] border border-[#bbf7d0] text-[#16a34a] text-xs p-3.5 rounded-xl text-center">{{ sucesso }}</div>

        <button @click="lidarCadastro" :disabled="carregando" class="w-full bg-gradient-to-r from-[#6C63FF] to-[#FF6B9D] hover:opacity-90 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#6C63FF]/30 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
          <svg v-if="carregando" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ carregando ? 'Preparando...' : 'Criar Perfil' }}</span>
        </button>
      </div>

      <div class="mt-6 text-center">
        <button @click="$emit('ir-para-login')" class="text-sm text-[#6C757D] hover:text-[#6C63FF] font-medium transition-colors cursor-pointer">
          Já faz parte? <span class="text-[#6C63FF] underline font-semibold">Entre aqui</span>
        </button>
      </div>

    </div>
  </div>
</template>