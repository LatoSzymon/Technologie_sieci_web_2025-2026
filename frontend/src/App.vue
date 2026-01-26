<script setup>
import { useRouter } from 'vue-router';
import { authStore } from './auth';
import { computed, onMounted } from 'vue';
import Notifications from './components/Notifications.vue';

const auth = authStore();
const router = useRouter();

const handleLogout = () => {
  auth.logout();
  router.push('/login');
}

onMounted(() => {
  auth.fetchUser();
})
</script>

<template>
  <nav>
    <header>
      <h1>ProgTalk</h1>
      <span>Bo Reddit jest nudny</span>
    </header>
    <router-link to="/topics" v-if="auth.isLoggedIn">Tematy</router-link>
    <router-link to="/home" v-if="auth.isLoggedIn">Home</router-link>
    <router-link to="/profile" v-if="auth.isLoggedIn">Profil</router-link>
    <router-link to="/chat" v-if="auth.isLoggedIn">Chat</router-link>
    <router-link v-if="auth.isAdmin" to="/admin">Panel admina</router-link>
    <router-link v-if="!auth.isLoggedIn" to="/login">Logowanie</router-link>
    <router-link v-if="!auth.isLoggedIn" to="/register">Rejestracja</router-link>
    <button v-if="auth.isLoggedIn" @click="handleLogout">Wyloguj</button>
  </nav>
  <Notifications />
  <main>
    <router-view />
  </main>
  <footer>
    <ul>
      Specjalne podziękowania dla wszystkich podmiotów, które wspierają rozwój ProgTalk:
      <li>UG</li>
      <li>"Biały Kot" - kocia kawiarnia</li>
      <li>Pizza Donatello</li>

    </ul>
  </footer>
</template>

<style scoped>
  nav {
    background: #061b82;
    padding: 1em;
    margin-bottom: 2em;
  }
  nav a {
    margin-right: 1em;
    text-decoration: none;
    color: #dfecd0;
  }
  footer {
    margin-top: 2em;
    padding: 1em;
    background: #061b82;
    text-align: center;
  }
</style>
