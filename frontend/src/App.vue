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
  background: #037e2a;
  padding: 1em;
  display: flex;
  align-items: center;
  width: 100%;
  top: 0;
  margin: 0;
  margin-bottom: 5vh;
  border-bottom: 2px solid #fff00033;
  letter-spacing: 2px;
}
nav a {
  margin-right: 1em;
  text-decoration: none;
}
nav h1 {
  margin: 0;
}

ul {
  list-style: none;
  width: 40%;
}
nav button {
  background-color: yellow;
}
nav span {
  font-size: 70%;
}
main {
  flex: 1 0 auto;
}
footer {
  margin: none;
  padding: 1em;
  background: #037e2a;
  text-align: center;
  flex-direction: column;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60%;
  width: 100%;
}

ul {
  font-size: 120%;
}


li {
  color: whitesmoke;
  font-size: 60%;
}

.links {
  margin-left: auto;
  margin-right: 2vw;
  display: flex;
  align-items: center;
}

nav button {
  margin: auto;
}


</style>
