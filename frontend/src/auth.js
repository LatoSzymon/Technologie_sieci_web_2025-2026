import {defineStore} from 'pinia';
import { ref, computed } from 'vue';
import { getMe } from './services/authService';

const authStore = defineStore('auth', () => {
    const user = ref(null);
    const accessToken = ref(null);
    const isLoggedIn = computed(() => !!user.value);
    const isAdmin = computed(() => user.value?.role === 'admin');
    const isApproved = computed(() => user.value?.isApprovedByAdmin);

    const fetchUser = async () => {
        try {
            const res = await getMe();
            user.value = res;
        } catch {
            user.value = null
        }
    }

    const logout = () => {
        user.value = null;
        accessToken.value = null;
    }

    return {user, accessToken, isLoggedIn, isApproved, isAdmin, fetchUser, logout};
})
