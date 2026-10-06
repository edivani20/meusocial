<script setup>
import { ref, onMounted } from 'vue'
import Login from './components/Login.vue'
import Cadastro from './components/Cadastro.vue'
import Feed from './components/Feed.vue'
import Perfil from './components/Perfil.vue'
import Ranking from './components/Ranking.vue'
import Planos from './components/Planos.vue'
import Notificacoes from './components/Notificacoes.vue'
import MinhasMensagens from './components/MinhasMensagens.vue'

const autenticado = ref(false)
const usuarioLogado = ref('')
const fotoPerfil = ref('')
const telaAtual = ref('login')
const abaAtiva = ref('feed')
const mostrarMensagens = ref(false)
const modoEscuro = ref(localStorage.getItem('modo_escuro') === 'true')
const toast = ref({ visivel: false, mensagem: '', tipo: 'info' })
let toastTimer

const mostrarToast = (mensagem, tipo = 'info') => {
  toast.value = { visivel: true, mensagem, tipo }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value.visivel = false }, 3500)
}
const alternarTema = () => {
  modoEscuro.value = !modoEscuro.value
  localStorage.setItem('modo_escuro', String(modoEscuro.value))
}
const onLoginSucesso = (usuario, foto = '') => {
  localStorage.setItem('auth', 'true'); localStorage.setItem('user', usuario)
  if (foto) { localStorage.setItem('foto_perfil', foto); fotoPerfil.value = foto }
  usuarioLogado.value = usuario; autenticado.value = true; abaAtiva.value = 'feed'
  mostrarToast(`Bem-vindo de volta, ${usuario.split('@')[0]}! 💜`, 'success')
}
const fazerLogout = async () => {
  try { await fetch('https://meusocial-api.onrender.com/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: usuarioLogado.value }) }) } catch (e) {}
  localStorage.clear(); autenticado.value = false; usuarioLogado.value = ''; fotoPerfil.value = ''; telaAtual.value = 'login'
}
onMounted(() => {
  if (localStorage.getItem('auth') === 'true') { autenticado.value = true; usuarioLogado.value = localStorage.getItem('user') || ''; fotoPerfil.value = localStorage.getItem('foto_perfil') || '' }
})
</script>

<template>
  <div :class="['min-h-screen font-sans transition-colors duration-300', modoEscuro ? 'theme-dark' : 'theme-light']">
    <template v-if="!autenticado">
      <transition name="fade-slide" mode="out-in">
        <Login v-if="telaAtual === 'login'" key="login" @login-sucesso="onLoginSucesso" @ir-para-cadastro="telaAtual = 'cadastro'" />
        <Cadastro v-else key="cadastro" @cadastro-sucesso="telaAtual = 'login'" @ir-para-login="telaAtual = 'login'" />
      </transition>
    </template>
    <div v-else class="min-h-screen pb-24">
      <nav class="app-nav sticky top-0 z-50"><div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3 cursor-pointer" @click="abaAtiva = 'feed'"><div class="brand-mark"><span>♥</span></div><div><h1 class="brand-title">Desabafa</h1><p class="brand-subtitle hidden sm:block">um espaço para acolher</p></div></div>
        <div class="flex items-center gap-2 sm:gap-4"><button @click="alternarTema" class="icon-button" :title="modoEscuro ? 'Usar tema claro' : 'Usar tema escuro'">{{ modoEscuro ? '☀️' : '🌙' }}</button><button @click="mostrarMensagens = true" class="icon-button" title="Minhas mensagens">💬</button><Notificacoes :usuarioLogado="usuarioLogado" /><div class="avatar avatar-small"><img v-if="fotoPerfil" :src="fotoPerfil" /><span v-else>{{ usuarioLogado.charAt(0).toUpperCase() }}</span></div><span class="greeting hidden md:block">Olá, <strong>{{ usuarioLogado.split('@')[0] }}</strong></span><button @click="fazerLogout" class="logout-button">Sair</button></div>
      </div></nav>
      <main class="max-w-6xl mx-auto px-0 sm:px-4 lg:px-6"><div class="desktop-layout">
        <aside class="side-card left-side hidden lg:block"><p class="side-label">NAVEGAÇÃO</p><button @click="abaAtiva = 'feed'" :class="['side-link', abaAtiva === 'feed' && 'active']">🏠 <span>Meu feed</span></button><button @click="abaAtiva = 'ranking'" :class="['side-link', abaAtiva === 'ranking' && 'active']">🏆 <span>Quem mais ajuda</span></button><button @click="abaAtiva = 'planos'" :class="['side-link', abaAtiva === 'planos' && 'active']">✨ <span>Desabafa VIP</span></button><button @click="abaAtiva = 'perfil'" :class="['side-link', abaAtiva === 'perfil' && 'active']">👤 <span>Meu perfil</span></button><div class="quote-card mt-6"><span>“</span><p>Todo sentimento merece ser ouvido.</p></div></aside>
        <section class="feed-column"><transition name="fade" mode="out-in"><Feed v-if="abaAtiva === 'feed'" :usuarioLogado="usuarioLogado" @logout="fazerLogout" @toast="mostrarToast" /><Ranking v-else-if="abaAtiva === 'ranking'" /><Planos v-else-if="abaAtiva === 'planos'" @toast="mostrarToast" /><Perfil v-else :usuarioLogado="usuarioLogado" @logout="fazerLogout" /></transition></section>
        <aside class="side-card right-side hidden xl:block"><div class="mini-highlight"><span class="highlight-icon">💜</span><div><p class="font-bold">Você não está sozinho</p><p class="text-xs opacity-75 mt-1">Compartilhe o que sente. A comunidade está aqui.</p></div></div><div class="mt-5"><p class="side-label">LEMBRETE DE HOJE</p><p class="daily-message">Cuidar de si também é uma forma de coragem.</p></div></aside>
      </div></main>
      <MinhasMensagens v-if="mostrarMensagens" :usuarioLogado="usuarioLogado" @fechar="mostrarMensagens = false" /><button @click="abaAtiva = 'feed'" class="floating-action" title="Escrever um desabafo">✎</button>
      <nav class="bottom-nav"><button @click="abaAtiva = 'feed'" :class="{ active: abaAtiva === 'feed' }"><span>🏠</span><small>Feed</small></button><button @click="abaAtiva = 'ranking'" :class="{ active: abaAtiva === 'ranking' }"><span>🏆</span><small>Ranking</small></button><button @click="abaAtiva = 'planos'" :class="{ active: abaAtiva === 'planos' }"><span>✨</span><small>VIP</small></button><button @click="abaAtiva = 'perfil'" :class="{ active: abaAtiva === 'perfil' }"><span>👤</span><small>Perfil</small></button></nav>
    </div>
    <transition name="toast"><div v-if="toast.visivel" :class="['toast-message', `toast-${toast.tipo}`]">{{ toast.mensagem }}</div></transition>
  </div>
</template>

<style>.fade-slide-enter-active,.fade-slide-leave-active{transition:all .3s ease}.fade-slide-enter-from{opacity:0;transform:translateY(12px)}.fade-slide-leave-to{opacity:0;transform:translateY(-12px)}.fade-enter-active,.fade-leave-active{transition:opacity .2s ease}.fade-enter-from,.fade-leave-to{opacity:0}</style>
