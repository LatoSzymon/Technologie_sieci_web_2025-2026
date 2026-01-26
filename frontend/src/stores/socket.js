import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io } from 'socket.io-client';
import { useTopicsStore } from '../topics';
import { authStore } from '../auth';
import { usePostStore } from '../posts';

export const useSocketStore = defineStore('socket', () => {
    const socket = ref(null);
    const connected = ref(false);
    const currentTopicId = ref(null);
    const eventListeners = ref({});

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

        socket.value.on('topic:updated', () => {
            console.log('[WebSocket] topic:updated received');
            const topicsStore = useTopicsStore();
            topicsStore.fetchTree();
        });

        socket.value.on('user:blocked', (data) => {
            const auth = authStore();
            const userId = auth.user?._id || auth.user?.id;
            if (data?.userId && data.userId === userId) {
                console.log('[WebSocket] user:blocked received - user is blocked');
                auth.blocked = true;
                window.dispatchEvent(new CustomEvent('user-blocked', { detail: data }));
            }
        });

        socket.value.on('user:unblocked', (data) => {
            const auth = authStore();
            const userId = auth.user?._id || auth.user?.id;
            if (data?.userId && data.userId === userId) {
                console.log('[WebSocket] user:unblocked received');
                auth.blocked = false;
                window.dispatchEvent(new CustomEvent('user-unblocked', { detail: data }));
            }
        });

        socket.value.on('user:approved', (data) => {
            const auth = authStore();
            const userId = auth.user?._id || auth.user?.id;
            if (data?.userId && data.userId === userId) {
                console.log('[WebSocket] user:approved received');
                auth.user.isApprovedByAdmin = true;
                window.dispatchEvent(new CustomEvent('user-approved', { detail: data }));
            }
        });

        socket.value.on('post:new', (post) => {
            console.log('[WebSocket] post:new received', post);
            const postStore = usePostStore();
            postStore.addPost(post);
        });

        socket.value.on('post:deleted', (data) => {
            console.log('[WebSocket] post:deleted received', data);
            const postStore = usePostStore();
            postStore.removePost(data.postId);
        });

        socket.value.on('post:liked', (data) => {
            console.log('[WebSocket] post:liked received', data);
            const postStore = usePostStore();
            postStore.updatePostLikes(data.postId, data.likesCount, data.liked, data.likes);
        });

        socket.value.on('admin:notify', (data) => {
            if (!window.__adminNotifications) window.__adminNotifications = [];
            window.__adminNotifications.push({ ...data, ts: new Date() });
            window.dispatchEvent(new CustomEvent('admin-notify', { detail: data }));
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
        connect,
        disconnect,
        joinTopic,
        leaveTopic,
        on,
        off,
        emit
    };
});
