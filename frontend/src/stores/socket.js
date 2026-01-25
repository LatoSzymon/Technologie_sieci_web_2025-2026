import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io } from 'socket.io-client';

export const useSocketStore = defineStore('socket', () => {
    const socket = ref(null);
    const connected = ref(false);
    const currentTopicId = ref(null);

    const connect = () => {
        if (socket.value?.connected) {
            console.log('Socket already connected');
            return;
        }

        // Połącz z backendem (HTTPS)
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
        
        // Opuść poprzedni temat jeśli był
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
            
            // Wrap callback to add logging
            const wrappedCallback = (...args) => {
                console.log(`Event received: ${event}`, args);
                callback(...args);
            };
            
            socket.value.on(event, wrappedCallback);
            
            // Store original callback reference for removal
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
