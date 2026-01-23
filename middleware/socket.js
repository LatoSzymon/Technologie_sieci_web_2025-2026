const {Server} = require("socket.io");

const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("Nowy socket sie łaczy");
        socket.on("elo", () => {
            socket.emit("żelo");
        });

        socket.on("disconnect", () => {
            console.log("Socket sie rozłączył", socket.id);
        });

        return io; 
    });
}

module.exports = {initSocket};