

import { reactive } from "vue";
import { io } from "socket.io-client";
import { postStore } from "./posts";
import { useTopicsStore } from "./topics";
// import { useUserStore } from "./user";

const state = reactive({
    connected: false,
    notifications: [],
    adminChat: [],
    socket: null
});

export const useSocket = () => {
    if (!state.socket) {
        state.socket = io("https://localhost:3443", {
            autoConnect: false,
            withCredentials: true,
            transports: ["websocket"],
            secure: true
        });

        state.socket.on("connect", () => {
            state.connected = true;
            state.socket.emit("auth", null);
        });

        state.socket.on("disconnect", () => {
            state.connected = false;
        });

        state.socket.on("post:new", (post) => {
            if (postStore && typeof postStore.addPost === 'function') {
                postStore.addPost(post);
            }
        });

        state.socket.on("topic:update", (topic) => {
            const topicsStore = useTopicsStore();
            if (topicsStore && typeof topicsStore.updateTopic === 'function') {
                topicsStore.updateTopic(topic);
            }
        });

        // state.socket.on("user:blocked", (data) => {
        //     const userStore = useUserStore();
        //     if (userStore && typeof userStore.setBlocked === 'function') {
        //         userStore.setBlocked(data);
        //     }
        // });

        state.socket.on("admin:notification", (notification) => {
            state.notifications.push(notification);
        });

        state.socket.on("chat:message", (msg) => {
            state.adminChat.push(msg);
        });
    }
    return state;
};


export const connectSocket = () => {
    const { socket, connected } = useSocket();
    if (socket && !connected) {
        socket.connect();
    }
};

export const disconnectSocket = () => {
    const { socket, connected } = useSocket();
    if (socket && connected) {
        socket.disconnect();
    }
};

export const sendAdminMessage = (toUserId, message) => {
    const { socket } = useSocket();
    if (socket) {
        socket.emit("admin:message", { toUserId, message });
    }
};

export const notifyAdmins = (data) => {
    const { socket } = useSocket();
    if (socket) {
        socket.emit("user.notifyAdmins", data);
    }
};
