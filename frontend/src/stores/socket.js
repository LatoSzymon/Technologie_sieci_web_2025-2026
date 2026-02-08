import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io } from 'socket.io-client';
import { useTopicsStore } from './topics';
import { authStore } from '../stores/auth';
import { usePostStore } from './posts';
import router from '../routing';

export const useSocketStore = defineStore('socket', () => {
    const socket = ref(null);
    const connected = ref(false);
    const currentTopicId = ref(null);
    // const eventListeners = ref({});
    const notifications = ref([]);

    const pushNotification = (notification) => {
        const entry = {
            id: crypto?.randomUUID?.() || String(Date.now()),
            ts: new Date(),
            type: notification.type || 'info',
            message: notification.message || 'Nowe powiadomienie'
        };
        notifications.value.unshift(entry);
        setTimeout(() => removeNotification(entry.id), 5000);
    };

    const removeNotification = (id) => {
        notifications.value = notifications.value.filter(n => n.id !== id);
    };

    const isViewingTopic = (topicId) => {
        if (!topicId) return false;
        if (currentTopicId.value === topicId) return true;
        const currentPath = router.currentRoute.value?.path || '';
        return currentPath === `/topics/${topicId}`;
    };
    const isViewingPending = () => {
        const currentPath = router.currentRoute.value?.path || '';
        return currentPath === '/pending';
    };

    const connect = () => {
        if (socket.value?.connected) {
            console.log('Socket already connected');
            return;
        }

        socket.value = io('https://localhost:3443', {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });

        socket.value.on('connect', () => {
            connected.value = true;
            console.log('Socket connected:', socket.value.id);

            if (currentTopicId.value) {
                joinTopic(currentTopicId.value);
            }
        });

        socket.value.on('disconnect', () => {
            connected.value = false;
            console.log('Socket disconnected');
        });

        socket.value.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        const refreshTopicData = (topicId) => {
            const topicsStore = useTopicsStore();
            if (topicsStore.refreshRoot) {
                topicsStore.refreshRoot();
            } else {
                topicsStore.fetchTree();
            }
            const targetId = topicId || currentTopicId.value;
            if (targetId) {
                topicsStore.fetchTopic(targetId);
            }
        };

        socket.value.on('topic:updated', (data) => {
            console.log('[WebSocket] topic:updated received', data);
            refreshTopicData(data?.topicId);
            if (data?.message) {
                pushNotification({ type: 'info', message: data.message });
            }
        });

        socket.value.on('topic:closed', (data) => {
            console.log('[WebSocket] topic:closed received', data);
            refreshTopicData(data?.topicId);
            if (isViewingTopic(data?.topicId)) {
                pushNotification({ type: 'warning', message: data?.message || 'Temat został zamknięty' });
            }
        });

        socket.value.on('topic:opened', (data) => {
            console.log('[WebSocket] topic:opened received', data);
            refreshTopicData(data?.topicId);
            if (isViewingTopic(data?.topicId)) {
                pushNotification({ type: 'success', message: data?.message || 'Temat został otwarty' });
            }
        });

        socket.value.on('topic:hidden', (data) => {
            console.log('[WebSocket] topic:hidden received', data);
            refreshTopicData(data?.topicId);
            if (isViewingTopic(data?.topicId)) {
                pushNotification({ type: 'warning', message: data?.message || 'Temat został ukryty' });
                leaveTopic(data?.topicId);
                const topicsStore = useTopicsStore();
                topicsStore.currentTopic = null;
                router.push('/topics');
            }
        });

        socket.value.on('topic:unhidden', (data) => {
            console.log('[WebSocket] topic:unhidden received', data);
            refreshTopicData(data?.topicId);
            if (isViewingTopic(data?.topicId)) {
                pushNotification({ type: 'success', message: data?.message || 'Temat został odkryty' });
            }
        });

        socket.value.on('user:blocked', (data) => {
            const auth = authStore();
            const userId = auth.user?._id || auth.user?.id;
            if (data?.userId && data.userId === userId) {
                console.log('[WebSocket] user:blocked received - user is blocked');
                auth.blocked = true;
                pushNotification({
                    type: 'error',
                    message: data?.message || 'Zostałeś zablokowany w serwisie'
                });
                auth.logout();
                router.push('/login');
            }
        });

        socket.value.on('user:unblocked', (data) => {
            const auth = authStore();
            const userId = auth.user?._id || auth.user?.id;
            if (data?.userId && data.userId === userId) {
                console.log('[WebSocket] user:unblocked received');
                auth.blocked = false;
                pushNotification({
                    type: 'success',
                    message: data?.message || 'Zostałeś odblokowany'
                });
                if (auth.fetchUser) {
                    auth.fetchUser();
                }
            }
        });

        socket.value.on('user:approved', (data) => {
            const auth = authStore();
            const userId = auth.user?._id || auth.user?.id;
            if (data?.userId && data.userId === userId) {
                console.log('[WebSocket] user:approved received');
                auth.user.isApprovedByAdmin = true;
                pushNotification({
                    type: 'success',
                    message: data?.message || 'Twoje konto zostało zaakceptowane'
                });
                if (auth.fetchUser) {
                    auth.fetchUser();
                }
                if (isViewingPending()) {
                    router.push('/');
                }
            }
        });

        socket.value.on('post:new', (post) => {
            console.log('[WebSocket] post:new received', post);
            const postStore = usePostStore();
            const topicId = post.topicId?._id || post.topicId;
            postStore.addPost(topicId, post);
            if (topicId && !isViewingTopic(topicId)) {
                pushNotification({
                    type: 'info',
                    message: 'Nowy post w temacie'
                });
            }
        });

        socket.value.on('post:deleted', (data) => {
            console.log('[WebSocket] post:deleted received', data);
            const postStore = usePostStore();
            postStore.removePost(data.topicId, data.postId);
            if (data?.topicId && isViewingTopic(data.topicId)) {
                pushNotification({
                    type: 'warning',
                    message: 'Post został usunięty'
                });
            }
        });

        socket.value.on('post:updated', (post) => {
            console.log('[WebSocket] post:updated received', post);
            const postStore = usePostStore();
            const topicId = post.topicId?._id || post.topicId || currentTopicId.value;
            if (topicId) {
                postStore.updatePost(topicId, post);
                if (isViewingTopic(topicId)) {
                    pushNotification({
                        type: 'info',
                        message: 'Post został zaktualizowany'
                    });
                }
            }
        });

        socket.value.on('user:reply', (data) => {
            pushNotification({
                type: 'info',
                message: data?.authorLogin
                    ? `Otrzymales odpowiedz od ${data.authorLogin}`
                    : 'Otrzymales odpowiedz na post'
            });
        });

        socket.value.on('user:postLiked', (data) => {
            pushNotification({
                type: 'info',
                message: 'Twoj post dostal like'
            });
        });

        socket.value.on('post:liked', (data) => {
            console.log('[WebSocket] post:liked received', data);
            const postStore = usePostStore();
            const topicId = data.topicId || currentTopicId.value;
            if (topicId) {
                postStore.updatePostLikes(topicId, data.postId, data.likesCount, data.liked, data.likes);
            }
        });

        socket.value.on('admin:notify', (data) => {
            pushNotification({
                type: data?.type || 'info',
                message: data?.message || 'Nowe powiadomienie admina'
            });
        });

        socket.value.on('tag:created', () => {
            const auth = authStore();
            if (auth.user?.role === 'admin') {
                pushNotification({ type: 'success', message: 'Dodano tag' });
            }
        });

        socket.value.on('tag:updated', () => {
            const auth = authStore();
            if (auth.user?.role === 'admin') {
                pushNotification({ type: 'info', message: 'Zaktualizowano tag' });
            }
        });

        socket.value.on('tag:deleted', () => {
            const auth = authStore();
            if (auth.user?.role === 'admin') {
                pushNotification({ type: 'warning', message: 'Usunieto tag' });
            }
        });

        socket.value.on('moderator:promoted', (data) => {
            if (data?.message) {
                pushNotification({ type: 'success', message: data.message });
            }
            if (data?.topicId) {
                refreshTopicData(data.topicId);
            }
        });

        socket.value.on('moderator:removed', (data) => {
            if (data?.message) {
                pushNotification({ type: 'warning', message: data.message });
            }
            if (data?.topicId) {
                refreshTopicData(data.topicId);
            }
        });

        socket.value.on('topic:moderatorAdded', (data) => {
            if (data?.topicId) {
                refreshTopicData(data.topicId);
            }
            pushNotification({ type: 'info', message: 'Dodano moderatora' });
        });

        socket.value.on('topic:moderatorRemoved', (data) => {
            if (data?.topicId) {
                refreshTopicData(data.topicId);
            }
            pushNotification({ type: 'warning', message: 'Usunieto moderatora' });
        });

        socket.value.on('topic:userBlocked', (data) => {
            console.log('[WebSocket] topic:userBlocked received', data);
            const auth = authStore();
            const userId = auth.user?._id || auth.user?.id;
            const topicsStore = useTopicsStore();
            if (data?.topic && topicsStore.currentTopic?._id === data.topic._id) {
                topicsStore.currentTopic.bannedUsersIds = data.topic.bannedUsersIds || [];
                topicsStore.currentTopic.blockedUserExceptions = data.topic.blockedUserExceptions || [];
            }
            if (data?.userId && data.userId === userId) {
                pushNotification({
                    type: 'warning',
                    message: data?.message || 'Zostałeś zablokowany w tym temacie'
                });
                if (isViewingTopic(data?.topicId)) {
                    leaveTopic(data?.topicId);
                    topicsStore.currentTopic = null;
                    router.push('/topics');
                }
                return;
            }
        });

        socket.value.on('topic:userUnblocked', (data) => {
            console.log('[WebSocket] topic:userUnblocked received', data);
            const topicsStore = useTopicsStore();
            if (data?.topic && topicsStore.currentTopic?._id === data.topic._id) {
                topicsStore.currentTopic.bannedUsersIds = data.topic.bannedUsersIds || [];
                topicsStore.currentTopic.blockedUserExceptions = data.topic.blockedUserExceptions || [];
            }
            const auth = authStore();
            const userId = auth.user?._id || auth.user?.id;
            if (data?.userId && data.userId === userId) {
                pushNotification({
                    type: 'success',
                    message: data?.message || 'Zostałeś odblokowany w tym temacie'
                });
                if (router.currentRoute.value?.path === `/topics/${data.topicId}`) {
                    refreshTopicData(data.topicId);
                }
            }
        });

        socket.value.on('user:deleted', (data) => {
            const auth = authStore();
            const userId = auth.user?._id || auth.user?.id;
            if (data?.userId && data.userId === userId) {
                pushNotification({
                    type: 'error',
                    message: data?.message || 'Twoje konto zostało usunięte'
                });
                auth.logout();
                router.push('/login');
            }
        });

        socket.value.on('user:profileUpdated', () => {
            pushNotification({ type: 'success', message: 'Profil zostal zaktualizowany' });
            const auth = authStore();
            if (auth.fetchUser) {
                auth.fetchUser();
            }
        });

        socket.value.on('user:securityUpdated', () => {
            pushNotification({ type: 'info', message: 'Zmieniono ustawienia bezpieczenstwa' });
        });
    };

    const disconnect = () => {
        if (socket.value) {
            socket.value.disconnect();
            socket.value = null;
            connected.value = false;
            currentTopicId.value = null;
        }
    };

    const joinTopic = (topicId) => {
        if (!socket.value?.connected) {
            console.warn('Socket not connected, cannot join topic');
            return;
        }

        if (currentTopicId.value && currentTopicId.value !== topicId) {
            socket.value.emit('leave-topic', currentTopicId.value);
        }
        
        socket.value.emit('join-topic', topicId);
        currentTopicId.value = topicId;
        console.log('Joined topic:', topicId);
    };

    const leaveTopic = (topicId) => {
        if (!socket.value?.connected) return;
        
        socket.value.emit('leave-topic', topicId);
        if (currentTopicId.value === topicId) {
            currentTopicId.value = null;
        }
        console.log('Left topic:', topicId);
    };

    const on = (event, callback) => {
        if (socket.value) {
            console.log(`Registering listener for event: ${event}`);

            const wrappedCallback = (...args) => {
                console.log(`Event received: ${event}`, args);
                callback(...args);
            };
            
            socket.value.on(event, wrappedCallback);

            if (!callback._wrapped) {
                callback._wrapped = wrappedCallback;
            }
        } else {
            console.warn(`Cannot register listener for ${event}, socket not initialized`);
        }
    };

    const off = (event, callback) => {
        if (socket.value) {
            console.log(`Removing listener for event: ${event}`);
            const callbackToRemove = callback._wrapped || callback;
            socket.value.off(event, callbackToRemove);
        }
    };

    const emit = (event, data) => {
        if (socket.value?.connected) {
            socket.value.emit(event, data);
        }
    };

    return {
        socket,
        connected,
        currentTopicId,
        notifications,
        pushNotification,
        removeNotification,
        connect,
        disconnect,
        joinTopic,
        leaveTopic,
        on,
        off,
        emit
    };
});
