<script setup>
import { useRoute, useRouter } from 'vue-router';
import { authStore } from './stores/auth';
import { onMounted, watch } from 'vue';
import Notifications from './components/Notifications.vue';

const auth = authStore();
const router = useRouter();
const route = useRoute();

const handleLogout = () => {
  auth.logout();
  router.push('/login');
};

onMounted(async () => {
  await auth.fetchUser();
});

watch(
  () => auth.isLoggedIn,
  (isLoggedIn) => {
    if (!isLoggedIn && !['/login', '/register'].includes(route.path)) {
      router.push('/login');
    }
  }
);
</script>

<template>
  <div id="app-layout">
    <nav>
      <header>
        <h1>ProgTalk</h1>
        <span>Bo Reddit nam nie wystarczy</span>
      </header>
      <div class="links">
        <router-link to="/topics" v-if="auth.isLoggedIn">Tematy</router-link>
        <!-- <router-link to="/home" v-if="auth.isLoggedIn">Home</router-link> -->
        <router-link to="/profile" v-if="auth.isLoggedIn">Profil</router-link>
        <router-link v-if="auth.isAdmin" to="/admin">Panel admina</router-link>
        <router-link v-if="!auth.isLoggedIn" to="/login">Logowanie</router-link>
        <router-link v-if="!auth.isLoggedIn" to="/register">Rejestracja</router-link>
        <button v-if="auth.isLoggedIn" @click="handleLogout">Wyloguj</button>
      </div>
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
  </div>
</template>

<style scoped>
#app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  width: 100%;
}
nav {
  background: #0f1d12;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  margin: 0 0 32px 0;
  border-bottom: 2px solid var(--border-soft);
  letter-spacing: 1.5px;
  position: sticky;
  top: 0;
  z-index: 10;
}
nav a {
  margin-right: 12px;
  text-decoration: none;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 4px;
}
nav a.router-link-active {
  border-color: var(--border);
  background: rgba(229, 242, 103, 0.08);
}
nav h1 {
  margin: 0;
  font-size: 1.6em;
}

ul {
  list-style: none;
  width: min(480px, 90%);
  padding: 0;
  margin: 0;
}
nav button {
  background-color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px 12px;
}
nav span {
  font-size: 0.7em;
  color: var(--text-soft);
}
main {
  flex: 1 0 auto;
}
footer {
  margin: 0;
  padding: 20px;
  background: #0f1d12;
  text-align: center;
  flex-direction: column;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7em;
  width: 100%;
  border-top: 2px solid var(--border-soft);
}

ul {
  font-size: 1.1em;
}

li {
  color: #d0d6a2;
  font-size: 0.85em;
}

.links {
  margin-left: auto;
  margin-right: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

nav button {
  margin: 0;
}

@media (max-width: 900px) {
  nav {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .links {
    width: 100%;
  }
}
</style>
