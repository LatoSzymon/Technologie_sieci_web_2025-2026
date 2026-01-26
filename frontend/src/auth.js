import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getMe, logoutMe } from './services/authService';
import { useSocketStore } from './stores/socket';

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
            
            console.log('User fetched:', res);
            
            // Po zalogowaniu połącz WebSocket
            if (res) {
                console.log('Connecting WebSocket...');
                const socketStore = useSocketStore();
                socketStore.connect();
            }
        } catch {
            user.value = null;
        } finally {
            loading.value = false;
        }
    };

    const logout = async () => {
        const socketStore = useSocketStore();
        socketStore.disconnect();
        
        user.value = null;
        await logoutMe();
    };

    return { user, isLoggedIn, isApproved, isAdmin, fetchUser, logout, loading };
});

export { authStore };
