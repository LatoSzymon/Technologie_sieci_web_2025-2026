require("dotenv").config();
const {Server} = require("socket.io");
const jwt = require("jsonwebtoken");
const Post = require("../models/Post");


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

        socket.on("post:like", async ({postId}) => {
            if (!socket.userId) {
                return;
            }

            try {
                const post = await Post.findById(postId);
                if (!post) {
                    return
                }

                let liked;
                if (userIndex === -1) {
                    post.likes.push(socket.userId);
                    post.dislikes = post.dislikes.filter(id => id.toString() !== socket.userId);
                } else {
                    post.likes.splice(likeIndex, 1);
                }

                await post.save();

                io.emit("post:like:update", {
                    postId, likesCount: post.likes.length, dislikesCount: post.dislikes.length,
                    likes: post.likes, dislikes: post.dislikes
                });
            } catch (err) {
                console.error("Błąd w sockecie przy like'owaniu posta");
            }
        });

        socket.on("post:dislike", async ({postId}) => {
            if (!socket.userId) return;
            try {
                const post = await Post.findById(postId);
                if (!post) {
                    return;
                };
                const dislikeIndex = post.dislikes.indexOf(socket.userId);
                if (dislikeIndex === -1) {
                    post.dislikes.push(socket.userId);
                    post.likes = post.likes.filter(
                        id => id.toString() !== socket.userId
                    );
                } else {
                    post.dislikes.splice(dislikeIndex, 1); // cofnij dislike
                }
                await post.save();

                io.emit("post:like:update", {
                    postId,
                    likesCount: post.likes.length,
                    dislikesCount: post.dislikes.length,
                    likes: post.likes,
                    dislikes: post.dislikes
                });
            } catch (err) {
                console.error("Błąd przy dislike'owaniu posta:", err);
            }
        });

        return io; 
    });
}

module.exports = {initSocket};