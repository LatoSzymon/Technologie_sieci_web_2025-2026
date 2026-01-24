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
    <form @submit.prevent="submit">
        <h2>Rejestracja</h2>
        <div v-if="error" class="error">{{ error }}</div>
        <div v-if="success" class="success">{{ success }}</div>
        <input type="email" v-model="email" placeholder="Email" required>
        <input type="text" v-model="login" placeholder="Login" required>
        <input type="password" v-model="password" placeholder="Hasło" required>
        <input type="password" v-model="confirmPassword" placeholder="Powtórz hasło" required>
        <button :disabled="loading">Zarejestruj</button>
    </form>
</template>