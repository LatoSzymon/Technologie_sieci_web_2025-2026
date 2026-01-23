require("dotenv").config();
const {Server} = require("socket.io");
const jwt = require("jsonwebtoken");


const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    const userSockets = new Map();

    io.on("connection", (socket) => {
        console.log("Nowy socket sie łaczy");
        socket.on("auth", (token) => {
            try {
                const payload = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = payload.id;
                socket.role = payload.role;
                userSockets.set(socket.userId, socket.id);

                if (socket.role === "admin") {
                    socket.join("admins");
                }

            } catch (err) {
                console.error(`Error ${err}`);
                socket.disconnect();
            }
        });
        
        socket.on("elo", () => {
            socket.emit("żelo");
        });

        socket.on("admin:message", ({toUserId, message}) => {
            const targetSocketId = userSockets.get(toUserId);
            if (targetSocketId) {
                io.to(targetSocketId).emit("admin:notify", {message});
            }
        });

        socket.on("user.notifyAdmins", (data) => {
            io.to("admins").emit("admin:notify", data);
        })

        socket.on("disconnect", () => {
            if (socket.userId) userSockets.delete(socket.userId);
            console.log("Socket sie rozłączył", socket.id);
        });

        return io; 
    });
}

module.exports = {initSocket};