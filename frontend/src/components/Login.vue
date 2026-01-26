<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {authStore} from '../auth';
import * as authService from '../services/authService';

const loginOrEmail = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const router = useRouter();
const auth = authStore();

const submit = async () => {
    error.value = '';
    loading.value = true;

    try {
        const data = { loginOrEmail: loginOrEmail.value, password: password.value };
        await authService.login(data);
        console.log("fetchuję usera po zalogowaniu");
        await auth.fetchUser();
        if (!auth.isApproved) {
            router.push('/pending');
        } else {
            router.push('/topics');
        }
    } catch (err) {
        error.value = err.response?.data?.message || "Błąd logowania"
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <form @submit.prevent="submit">
        <h2>Logowanie</h2>
        <div v-if="error">{{ error }}</div>
        <input v-model="loginOrEmail" type="text" placeholder="Login albo email" required />
        <input v-model="password" type="password" placeholder="Hasło" required />
        <button :disabled="loading">Zaloguj</button>
  </form>
</template>

<style>
    div {
        color: red;
    }
</style>