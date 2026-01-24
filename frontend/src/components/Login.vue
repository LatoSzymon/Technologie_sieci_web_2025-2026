<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {authStore} from '../auth';
import * as authService from '../services/authService';

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const router = useRouter();
const auth = authStore();

const submit = async () => {
    error.value = '';
    loading.value = true;

    try {
        const data = { email: email.value, password: password.value };
        const res = await authService.login(data);
        auth.accessToken = res.accessToken

        await auth.fetchUser();
        if (!auth.isApproved) {
            router.push('/pending');
        } else {
            router.push('/app')
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
        <input v-model="email" type="email" placeholder="Email" required />
        <input v-model="password" type="password" placeholder="Hasło" required />
        <button :disabled="loading">Zaloguj</button>
  </form>
</template>

<style>
    div {
        color: red;
    }
</style>