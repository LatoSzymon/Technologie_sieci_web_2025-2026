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
  margin: 0;
  padding: 1em;
  background: #037e2a;
  text-align: center;
  border-top: 2px solid #fff00033;
  flex-direction: column;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60%;
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
