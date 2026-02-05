const Post = require("../models/Post");
const Topic = require("../models/Topic");
const { post } = require("../routes/userRoutes");

const toId = v => (v?.toString ? v.toString() : String(v));
const hasId = (arr, id) => arr?.some(x => toId(x) === toId(id));

const isUserBlockedInTopic = (topic, userId) => {
  if (!topic || !userId) return false;
  if (!hasId(topic.bannedUsersIds, userId)) return false;

  const exc = topic.blockedUserExceptions?.find(e => hasId([e.userId], userId));
  if (exc?.allowedInTopicIds?.length && hasId(exc.allowedInTopicIds, topic._id)) return false;
  return true;
};

const createPost = async (req, res) => {
    try {
        const {topicId, content, codeBlocks, replyTo, tags} = req.body;
        const authorId = req.user.userId;

        if (!topicId || !content) {
            return res.status(400).json({message: "Nie podano kluczowych elementów"});
        }

        const topic = await Topic.findById(topicId);

        if (!topic) {
            return res.status(404).json({message: "Temat o takim id nie istnieje"});
        }

        if (topic.isClosed) {
            return res.status(403).json({message: "Temat zamknięty, nie można w nim pisać"});
        }

        if (isUserBlockedInTopic(topic, authorId)) {
            return res.status(403).json({message:"Jestes zablokowany w tym temacie"});
        }

        const post = new Post({
            topicId, 
            authorId, 
            content, 
            codeBlocks: codeBlocks || [],
            replyTo: replyTo || null,
            tags: tags || []
        });

        await post.save();

        await post.populate('authorId', 'login email');
        await post.populate('tags');
        if (replyTo) {
            await post.populate({
                path: 'replyTo',
                populate: {
                    path: 'authorId',
                    select: 'login email'
                }
            });
        }

        try {
            const io = req.app.get('io');
            if (io) {
                console.log(`Emitting post:new to topic:${topicId}`);
                console.log(`Post data:`, {
                    id: post._id,
                    topicId: post.topicId,
                    content: post.content.substring(0, 50) + '...',
                    author: post.authorId?.login
                });

                io.to(`topic:${topicId}`).emit("post:new", post);
                console.log(`Event emitted successfully`);
            } else {
                console.error('io is not available on app');
            }
        } catch (e) {
            console.error("Nie udało się wysłać post:new przez websocket", e);
        }
        return res.status(201).json({message: "Utworzono post", post});

        
    } catch (err) {
        return res.status(500).json({message: "Problem z utworzeniem posta", err});
    }
}


const toggleLike = async (req, res) => {
    try {
        const {postId} = req.params;
        const userId = req.user.userId;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({message: "Nie znaleziono posta"});
        }

        const userIdStr = userId.toString ? userId.toString() : String(userId);
        const liked = post.likes.some(id => (id.toString ? id.toString() : String(id)) === userIdStr);

        if (liked) {
            post.likes.pull(userId);
        } else {
            post.likes = post.likes.filter(id => (id.toString ? id.toString() : String(id)) !== userIdStr);
            post.likes.push(userId);
        }
        
        await post.save();

        const normalizedLikes = post.likes.map(id => id.toString ? id.toString() : String(id));

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.to(`topic:${post.topicId}`).emit('post:liked', { 
                    postId: post._id, 
                    userId: userIdStr, 
                    likesCount: post.likes.length,
                    likes: normalizedLikes,
                    liked: !liked 
                });
                console.log(`Emitted post:liked for post ${post._id}`);
            }
        } catch (e) {
            console.error('WebSocket error (toggleLike):', e);
        }

        return res.status(200).json({
            message: "Poprawna zmiana stanu like'owania", 
            liked: !liked, 
            likesCount: post.likes.length,
            likes: normalizedLikes
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({message: "Nie udało się dodać like", err});
    }
}

const deletePost = async (req, res) => {
    try {
        const {postId} = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({message: "Nie udało się znaleźć posta o tym id"});    
        }

        if (userRole === "admin" || userId === post.authorId) {
            post.isDeleted = true;
            await post.save();

            try {
                const io = req.app.get && req.app.get('io');
                if (io) {
                    io.to(`topic:${post.topicId}`).emit('post:deleted', { postId: post._id, topicId: post.topicId });
                    console.log(`Emitted post:deleted for post ${post._id}`);
                }
            } catch (e) {
                console.error('WebSocket error (deletePost):', e);
            }
            
            return res.status(200).json({message: "Usunięto post", post});
        } else {
             return res.status(403).json({message: "Aniś admin, ani właściciel posta"});
        }



    } catch (err) {
        console.error(err);
        
        return res.status(500).json({message: "Błąd usuwania posta", err});
    }
}

const updatePost = async (req, res) => {
    try {
        const {postId} = req.params;
        const {content, codeBlocks} = req.body;
        const userId = req.user.userId;
        const userRole = req.user.role;

        if (!content || !content.trim()) {
            return res.status(400).json({message: "Treść posta nie może być pusta"});
        }

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({message: "Nie znaleziono posta"});
        }

        if (userRole !== "admin" && userId.toString() !== post.authorId.toString()) {
            return res.status(403).json({message: "Nie masz uprawnień do edycji tego posta"});
        }

        post.content = content;
        if (codeBlocks) {
            post.codeBlocks = codeBlocks;
        }

        await post.save();
        await post.populate('authorId', 'login email');
        await post.populate('tags');

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.to(`topic:${post.topicId}`).emit('post:updated', post);
                console.log(`Emitted post:updated for post ${post._id}`);
            }
        } catch (e) {
            console.error('WebSocket error (updatePost):', e);
        }

        return res.status(200).json({message: "Zaktualizowano post", post});

    } catch (err) {
        console.error(err);
        return res.status(500).json({message: "Błąd aktualizacji posta", err});
    }
}

module.exports = {createPost, toggleLike, deletePost, updatePost};