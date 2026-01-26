<script setup>
import { useRouter } from 'vue-router';
import { authStore } from './auth';
import { computed, onMounted, onBeforeUnmount } from 'vue';
import Notifications from './components/Notifications.vue';

const auth = authStore();
const router = useRouter();

const handleLogout = () => {
  auth.logout();
  router.push('/login');
}

const handleUserBlocked = (e) => {
  console.log('User blocked event received:', e.detail);
  alert('Zostałeś zablokowany przez moderatora');
  auth.logout();
  router.push('/login');
};

const handleUserUnblocked = (e) => {
  console.log('User unblocked event received:', e.detail);
  alert('Zostałeś odblokowany!');
};

const handleUserApproved = (e) => {
  console.log('User approved event received:', e.detail);
  alert('Twoje konto zostało zaakceptowane! Proszę odśwież stronę.');
};

onMounted(() => {
  auth.fetchUser();
  window.addEventListener('user-blocked', handleUserBlocked);
  window.addEventListener('user-unblocked', handleUserUnblocked);
  window.addEventListener('user-approved', handleUserApproved);
});

onBeforeUnmount(() => {
  window.removeEventListener('user-blocked', handleUserBlocked);
  window.removeEventListener('user-unblocked', handleUserUnblocked);
  window.removeEventListener('user-approved', handleUserApproved);
});
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
