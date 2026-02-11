<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {authStore} from '../stores/auth';
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
    <div class="auth-container">
        <form @submit.prevent="submit" class="auth-form">
            <h2>Logowanie</h2>
            <div v-if="error" class="auth-alert">{{ error }}</div>
            <input v-model="loginOrEmail" type="text" placeholder="Login albo email" required />
            <input v-model="password" type="password" placeholder="Hasło" required />
            <button :disabled="loading" class="login-btn">Zaloguj</button>
        </form>
    </div>
</template>

<style scoped>
    .auth-container {
        min-height: 70vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
    }

    .auth-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: min(420px, 100%);
        padding: 22px;
        background: var(--panel);
        border: 2px solid var(--border);
    }

    .auth-form h2 {
        margin: 0 0 6px 0;
        color: var(--accent);
        text-align: center;
    }

    .auth-form input {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid var(--border);
        background: #0d0d0d;
        color: var(--text);
        font-family: inherit;
    }

    .auth-alert {
        padding: 10px 12px;
        background: rgba(244, 107, 107, 0.2);
        border-left: 4px solid var(--danger);
    }

    .login-btn {
        margin-top: 6px;
        background-color: var(--accent);
        border: 2px solid var(--border);
    }
</style>