require("dotenv").config();
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const initSocket = (server) => {
    const allowedOrigins = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);

    const io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    const userSockets = new Map();

    io.use((socket, next) => {
        try {
            const cookies = socket.handshake.headers.cookie;
            if (!cookies) {
                console.log("Socket: brak cookie");
                return next(new Error("Authentication error"));
            }

            const parsedCookies = cookie.parse(cookies);
            const token = parsedCookies.jwt;

            if (!token) {
                console.log("Socket: brak JWT token");
                return next(new Error("Authentication error"));
            }

            const payload = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = payload.userId;
            socket.role = payload.role;
            
            console.log(`Socket authenticated: userId=${socket.userId}, role=${socket.role}`);
            next();
        } catch (err) {
            console.error("Socket auth error:", err.message);
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}, user: ${socket.userId}`);

        userSockets.set(socket.userId, socket.id);

        socket.join(`user:${socket.userId}`);

        if (socket.role === "admin") {
            socket.join("admins");
            console.log(`User ${socket.userId} joined admins room`);
        }

        socket.on("join-topic", (topicId) => {
            socket.join(`topic:${topicId}`);
            console.log(`User ${socket.userId} joined topic:${topicId}`);
            console.log(`Rooms for socket ${socket.id}:`, Array.from(socket.rooms));
        });

        socket.on("leave-topic", (topicId) => {
            socket.leave(`topic:${topicId}`);
            console.log(`User ${socket.userId} left topic:${topicId}`);
        });

        socket.on("admin:message", ({ toUserId, message }) => {
            const targetSocketId = userSockets.get(toUserId);
            if (targetSocketId) {
                io.to(targetSocketId).emit("admin:notify", { message });
            }
        });

        socket.on("user:notifyAdmins", (data) => {
            io.to("admins").emit("admin:notify", data);
        });

        socket.on("disconnect", () => {
            if (socket.userId) {
                userSockets.delete(socket.userId);
            }
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

module.exports = { initSocket };