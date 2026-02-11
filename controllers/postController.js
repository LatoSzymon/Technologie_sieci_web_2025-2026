const Post = require("../models/Post");
const Topic = require("../models/Topic");
const TopicParticipant = require("../models/TopicParticipant");
const { createPostSchema, updatePostSchema } = require("../validation/schemas");
const { validate } = require("../validation/validate");
const { getAllowedTagsForTopic } = require("../services/tagScope");

const toId = v => (v?.toString ? v.toString() : String(v));
const hasId = (arr, id) => arr?.some(x => toId(x) === toId(id));

const isUserBlockedInTopic = (topic, userId) => {
  if (!topic || !userId) {
    return false;
  }
  if (!hasId(topic.bannedUsersIds, userId)){
    return false;
  };

  const exc = topic.blockedUserExceptions?.find(e => hasId([e.userId], userId));
  if (exc?.allowedInTopicIds?.length && hasId(exc.allowedInTopicIds, topic._id)) {
        return false;
    };

  return true;
};

const createPost = async (req, res) => {
    try {
        const parsed = validate(createPostSchema, req.body);
        if (!parsed.ok) {
            return res.status(400).json({ message: parsed.message });
        }

        const {topicId, content, replyTo, tags} = parsed.data;
        const authorId = req.user.userId;

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

        if (tags && Array.isArray(tags) && tags.length > 0) {
            const allowedTags = await getAllowedTagsForTopic(topicId);
            const allowedIds = new Set(
                allowedTags.map(tag => (tag._id?.toString ? tag._id.toString() : String(tag._id)))
            );
            const invalid = tags.some(tagId => !allowedIds.has(tagId?.toString ? tagId.toString() : String(tagId)));
            if (invalid) {
                return res.status(400).json({ message: "Nieprawidlowe tagi dla tego tematu" });
            }
        }

        const post = new Post({
            topicId,
            authorId,
            content,
            replyTo: replyTo || null,
            tags: tags || []
        });

        await post.save();

        await TopicParticipant.updateOne(
            { topicId, userId: authorId },
            { $set: { lastPostAt: new Date() } },
            { upsert: true }
        );
        
        await post.populate('authorId', 'login mail role isBlocked');
        await post.populate('tags');
        if (replyTo) {
            await post.populate({
                path: 'replyTo',
                populate: {
                    path: 'authorId',
                    select: 'login mail role isBlocked'
                }
            });
        }

        try {
            const io = req.app.get('io');
            if (io) {
                io.to(`topic:${topicId}`).emit("post:new", post);

                const participantPayload = {
                    topicId,
                    user: {
                        _id: post.authorId?._id || authorId,
                        login: post.authorId?.login,
                        mail: post.authorId?.mail,
                        role: post.authorId?.role,
                        isBlocked: post.authorId?.isBlocked
                    }
                };
                io.to(`topic:${topicId}`).emit('topic:participantsUpdated', participantPayload);

                if (replyTo) {
                    try {
                        const replyPost = await Post.findById(replyTo).populate('authorId', 'login');
                        const replyAuthorId = replyPost?.authorId?._id || replyPost?.authorId;
                        const replyAuthorStr = replyAuthorId?.toString ? replyAuthorId.toString() : String(replyAuthorId || '');
                        const authorStr = authorId?.toString ? authorId.toString() : String(authorId || '');

                        if (replyAuthorStr && replyAuthorStr !== authorStr) {
                            io.to(`user:${replyAuthorStr}`).emit('user:reply', {
                                topicId,
                                postId: post._id,
                                replyToPostId: replyTo,
                                authorId,
                                authorLogin: post.authorId?.login,
                                snippet: (post.content || '').slice(0, 140)
                            });
                        }
                    } catch (notifyErr) {
                        console.error('WebSocket error (reply notify):', notifyErr);
                    }
                }
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
                    topicId: post.topicId,
                    likesCount: post.likes.length,
                    likes: normalizedLikes,
                    liked: !liked 
                });

                if (!liked) {
                    const authorId = post.authorId?.toString ? post.authorId.toString() : String(post.authorId || '');
                    if (authorId && authorId !== userIdStr) {
                        io.to(`user:${authorId}`).emit('user:postLiked', {
                            topicId: post.topicId,
                            postId: post._id,
                            likedBy: userIdStr
                        });
                    }
                }
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

        const topic = await Topic.findById(post.topicId);
        if (!topic) {
            return res.status(404).json({message: "Nie znaleziono tematu dla tego posta"});
        }

        const userIdStr = userId?.toString ? userId.toString() : String(userId);
        const authorIdStr = post.authorId?.toString ? post.authorId.toString() : String(post.authorId);
        const isOwner = topic.ownerId?.toString ? topic.ownerId.toString() === userIdStr : String(topic.ownerId) === userIdStr;
        const isModerator = topic.moderatorsId?.some(id => (id?.toString ? id.toString() : String(id)) === userIdStr);

        if (userRole === "admin" || authorIdStr === userIdStr || isOwner || isModerator) {
            post.isDeleted = true;
            await post.save();

            try {
                const io = req.app.get && req.app.get('io');
                if (io) {
                    io.to(`topic:${post.topicId}`).emit('post:deleted', {
                        postId: post._id,
                        topicId: post.topicId,
                        deletedBy: userId
                    });
                    console.log(`Emitted post:deleted for post ${post._id}`);
                }
            } catch (e) {
                console.error('WebSocket error (deletePost):', e);
            }
            
            return res.status(200).json({message: "Usunięto post", post});
        } else {
               return res.status(403).json({message: "Brak uprawnień do usunięcia posta"});
        }



    } catch (err) {
        console.error(err);
        
        return res.status(500).json({message: "Błąd usuwania posta", err});
    }
}

const updatePost = async (req, res) => {
    try {
        const {postId} = req.params;
        const parsed = validate(updatePostSchema, req.body);
        if (!parsed.ok) {
            return res.status(400).json({ message: parsed.message });
        }

        const {content} = parsed.data;
        const userId = req.user.userId;
        const userRole = req.user.role;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({message: "Nie znaleziono posta"});
        }

        if (userRole !== "admin" && userId.toString() !== post.authorId.toString()) {
            return res.status(403).json({message: "Nie masz uprawnień do edycji tego posta"});
        }

        post.content = content;

        await post.save();
        await post.populate('authorId', 'login mail role isBlocked');
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

const getDeletedPosts = async (req, res) => {
    try {
        const {topicId} = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (req.user.role !== 'admin') {
            return res.status(403).json({message: "Nie masz do tego uprawnień"});
        }

        const posts = await Post.find({topicId, isDeleted: true})
            .sort({createdAt: -1})
            .skip((page-1) * limit)
            .limit(limit)
            .populate("authorId", "login mail")
            .populate('tags');

        const total = await Post.countDocuments({topicId, isDeleted: true});

        return res.status(200).json({
            posts, page, total, pages: Math.ceil(total / limit)
        });

    } catch (error) {
        return res.status(500).json({message: "Błąd przy pobieraniu usuwanych postów", error})
    }
};

module.exports = {createPost, toggleLike, deletePost, updatePost, getDeletedPosts};