<script setup>
    import { ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { register } from '../services/authService';
    const email = ref('');
    const login = ref('');
    const password = ref('');
    const confirmPassword = ref('');
    const error = ref('');
    const success = ref('');
    const loading = ref(false);
    const router = useRouter();

    const submit = async () => {
        error.value = '';
        success.value = '';
        loading.value = true;

        try {
            const data = {mail: email.value, login: login.value, password: password.value, confirmPassword: confirmPassword.value};
            if (data.password !== data.confirmPassword) {
                error.value = "Hasła muszą się zgadzać"
            } else {
                await register(data);
                success.value = "Rejestracja się powiodła. Twoje konto oczekuje na akceptację przez admina";
                setTimeout(() => router.push('/login') , 2000);
            }
        } catch (e) {
            error.value = e.response?.data?.message || "Błąd rejestracji";
        } finally {
            loading.value = false;
        }
    }

</script>

<template>
    <div class="auth-container">
        <form @submit.prevent="submit" class="auth-form">
            <h2>Rejestracja</h2>
            <div v-if="error" class="auth-alert error">{{ error }}</div>
            <div v-if="success" class="auth-alert success">{{ success }}</div>
            <input type="email" v-model="email" placeholder="Email" required>
            <input type="text" v-model="login" placeholder="Login" required>
            <input type="password" v-model="password" placeholder="Hasło" required>
            <input type="password" v-model="confirmPassword" placeholder="Powtórz hasło" required>
            <button :disabled="loading" class="reg-btn">Zarejestruj</button>
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
        border-left: 4px solid var(--border);
    }

    .auth-alert.error {
        background: rgba(244, 107, 107, 0.2);
        border-left-color: var(--danger);
    }

    .auth-alert.success {
        background: rgba(111, 224, 129, 0.2);
        border-left-color: var(--success);
    }

    .reg-btn {
        margin-top: 6px;
        background-color: var(--accent);
        border: 2px solid var(--border);
    }
</style>