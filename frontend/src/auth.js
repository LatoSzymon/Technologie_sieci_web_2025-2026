import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getMe, logoutMe } from './services/authService';

const authStore = defineStore('auth', () => {
    const user = ref(null);
    const loading = ref(true);
    const isLoggedIn = computed(() => !!user.value);
    const isAdmin = computed(() => user.value?.role === 'admin');
    const isApproved = computed(() => user.value?.isApprovedByAdmin);

    const fetchUser = async () => {
        loading.value = true;
        try {
            const res = await getMe();
            user.value = res;
        } catch {
            user.value = null;
        } finally {
            loading.value = false;
        }
    };

    const logout = async () => {
        user.value = null;
        await logoutMe();
    };

    return { user, isLoggedIn, isApproved, isAdmin, fetchUser, logout, loading };
});

export { authStore };
