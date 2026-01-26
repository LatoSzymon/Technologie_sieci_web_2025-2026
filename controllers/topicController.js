const Topic = require('../models/Topic');
const User = require('../models/User');
const Post = require("../models/Post");
const Tag = require("../models/Tag");

const getAllSubtopics = async (topicId) => {
    const topic = await Topic.findById(topicId);
    if (!topic || !topic.children.length) return [];
    let subtopics = [...topic.children];
    for (const childId of topic.children) {
        const childSubtopics = await getAllSubtopics(childId);
        subtopics = [...subtopics, ...childSubtopics];
    }
    return subtopics;
};

const isUserBlockedInTopic = (topic, userId) => {
    if (!topic || !userId) return false;
    
    const userIdStr = userId.toString ? userId.toString() : String(userId);

    const isBanned = topic.bannedUsersIds.some(id => {
        const idStr = id.toString ? id.toString() : String(id);
        return idStr === userIdStr;
    });
    
    if (!isBanned) return false;

    if (topic.blockedUserExceptions && Array.isArray(topic.blockedUserExceptions)) {
        const exception = topic.blockedUserExceptions.find(exc => {
            const excUserIdStr = exc.userId.toString ? exc.userId.toString() : String(exc.userId);
            return excUserIdStr === userIdStr;
        });
        
        if (exception && exception.allowedInTopicIds && Array.isArray(exception.allowedInTopicIds)) {
            const isInAllowedList = exception.allowedInTopicIds.some(topicId => {
                const allowedIdStr = topicId.toString ? topicId.toString() : String(topicId);
                return allowedIdStr === topic._id.toString();
            });
            
            if (isInAllowedList) {
                return false;
            }
        }
    }
    
    return true;
};


const blockUserInTopic = async (req, res) => {
    try {
        const { topicId, userId, exceptTopicIds = [] } = req.body;
        const currentUserId = req.user.userId;
        if (!topicId || !userId) {
            return res.status(400).json({ message: 'topicId i userId są wymagane' });
        }
        const topic = await Topic.findById(topicId);
        if (!topic) {
            return res.status(404).json({ message: 'Temat nie istnieje' });
        }

        const isModerator = topic.ownerId.equals(currentUserId) || topic.moderatorsId.some(id => id.equals(currentUserId) || req.user.role === "admin");
        if (!isModerator) {
            return res.status(403).json({ message: 'Tylko moderator lub admin może blokować użytkowników w tym temacie' });
        }

        if (!topic.bannedUsersIds.some(id => id.equals(userId))) {
            topic.bannedUsersIds.push(userId);
        }

        topic.blockedUserExceptions = (topic.blockedUserExceptions || []).filter(
            exc => !exc.userId.equals(userId)
        );

        if (exceptTopicIds && exceptTopicIds.length > 0) {
            topic.blockedUserExceptions.push({
                userId: userId,
                allowedInTopicIds: exceptTopicIds
            });
        }

        await topic.save();

        const subtopics = await getAllSubtopics(topicId);

        if (subtopics.length > 0) {

            for (const subtopicId of subtopics) {
                if (!exceptTopicIds.includes(subtopicId.toString())) {
                    await Topic.updateOne(
                        { _id: subtopicId, bannedUsersIds: { $ne: userId } },
                        { $push: { bannedUsersIds: userId } }
                    );
                }
            }
        }

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.to(`user:${userId}`).emit('user:blocked', { userId, topicId, reason: req.body.reason || '' });
                io.to(`topic:${topicId}`).emit('topic:userBlocked', { userId, topicId, exceptTopicIds });
                console.log(`Emitted user:blocked to user:${userId}`);
            }
        } catch (e) {
            console.error('WebSocket error (blockUser):', e);
        }
        
        return res.status(200).json({ message: 'Użytkownik zablokowany w temacie i podtematach', topic: topic });
    } catch (error) {
        return res.status(500).json({ message: 'Błąd blokowania użytkownika', error: error.message });
    }
};

const createTopic = async (req, res) => {
    try {
        const {name, description, tags, parentId} = req.body;
        const userId = req.user.userId;
        if (!name) {
            name = `Temat użytkownika ${req.user.login}`;
        }

        let validatedTags = [];
        if (tags && Array.isArray(tags)) {
            for (const tagId of tags) {
                try {
                    const tag = await Tag.findById(tagId);
                    if (tag) {
                        validatedTags.push(tagId);
                    }
                } catch (e) {
                    console.warn(`Invalid tag ID: ${tagId}`);
                }
            }
        }

        let parent = null;
        if (parentId) {
            parent = await Topic.findById(parentId);

            if (!parent) {
                return res.status(404).json({message: "Podany temat nadrzędny nie istnieje"});
            }

            const isModerator = parent.ownerId.equals(userId) || parent.moderatorsId.some(id => id.equals(userId)) || req.user.role === "admin";
            if (!isModerator) {
                return res.status(403).json({message: "Odmowa dostępu. Użytkowmin musi być moderatorem tematu nadrzędnego"});
            }
        }

        const inheritModeratorsId = parent ? [...parent.moderatorsId, parent.ownerId] : [];

        const topic = new Topic({
            name, description: description || '', tags: validatedTags, ownerId: userId,
            moderatorsId: inheritModeratorsId.filter(id => !id.equals(userId)), parent: parentId || null
        })

        await topic.save();

        if (parent) {
            parent.children.push(topic._id);
            await parent.save();
        }

        await User.findByIdAndUpdate(userId, { $push: { OwnedTopics: topic._id } });

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.emit('topic:updated', { topicId: topic._id, action: 'created', topic });
                console.log(`Emitted topic:updated for created topic ${topic._id}`);
            }
        } catch (e) {
            console.error('WebSocket error (createTopic):', e);
        }
        
        return res.status(201).json({message: "Temat został utworzony", topic});
    } catch (error) {
        return res.status(500).json({ message: "Błąd przy tworzeniu tematu", error});
    }
};

const listRootTopics = async (_req, res) => {
    try {
        const topics = await Topic.find({parent: null, isHidden: false})
            .populate("ownerId", "login mail")
            .select('-bannedUsersIds');
        
        return res.status(200).json({topics});
    } catch (error) {
        return res.status(500).json({message: "Błąd przy wylistowywaniu tematów-korzeni", error});
    }
};

const getTopicById = async (req, res) => {
    try {
        const id = req.params.id;
        const topic = await Topic.findById(id)
            .populate('ownerId', 'login mail')
            .populate('moderatorsId', 'login mail')
            .populate('children', 'name description');

        if (!topic) {
            return res.status(404).json({message: 'Taki temat nie istnieje'});
        }

        if (topic.isHidden && req.user?.role !== 'admin') {
            return res.status(403).json({message: "Ten temat jest ukryty"});
        }

        return res.status(200).json(topic);
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: "Błąd przy pobieraniu wybranego tematu", error});
    }
};

const unblockUserInTopic = async (req, res) => {
    try {
        const { topicId, userId } = req.body;
        const currentUserId = req.user.userId;
        if (!topicId || !userId) {
            return res.status(400).json({ message: 'topicId i userId są wymagane' });
        }
        const topic = await Topic.findById(topicId);
        if (!topic) {
            return res.status(404).json({ message: 'Temat nie istnieje' });
        }

        const isModerator = topic.ownerId.equals(currentUserId) || topic.moderatorsId.some(id => id.equals(currentUserId)) || req.user.role === "admin";
        if (!isModerator) {
            return res.status(403).json({ message: 'Tylko moderator lub admin może odblokować użytkownika w tym temacie' });
        }

        if (topic.bannedUsersIds.some(id => id.equals(userId))) {
            topic.bannedUsersIds = topic.bannedUsersIds.filter(id => !id.equals(userId));
        }

        topic.blockedUserExceptions = (topic.blockedUserExceptions || []).filter(
            exc => !exc.userId.equals(userId)
        );

        await topic.save();

        const subtopics = await getAllSubtopics(topicId);

        if (subtopics.length > 0) {
            await Topic.updateMany(
                { _id: { $in: subtopics } },
                { $pull: { bannedUsersIds: userId } }
            );

            await Topic.updateMany(
                { _id: { $in: subtopics } },
                { $pull: { blockedUserExceptions: { userId: userId } } }
            );
        }

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.to(`user:${userId}`).emit('user:unblocked', { userId, topicId });
                io.to(`topic:${topicId}`).emit('topic:userUnblocked', { userId, topicId });
                console.log(`Emitted user:unblocked to user:${userId}`);
            }
        } catch (e) {
            console.error('WebSocket error (unblockUser):', e);
        }
        
        return res.status(200).json({ message: 'Użytkownik odblokowany w temacie i podtematach', topic: topic });
    } catch (error) {
        return res.status(500).json({ message: 'Błąd odblokowywania użytkownika', error: error.message });
    }
};

const buildTree = async (parentId = null) => {
    try {
        const topics = await Topic.find({parent: parentId, isHidden: false})
            .populate('tags', 'name');
        const tree = [];

        for (const topic of topics) {
            const children = await buildTree(topic._id);

            tree.push({
                id: topic._id, 
                name: topic.name, 
                path: topic.path, 
                children, 
                isHidden: topic.isHidden, 
                isClosed: topic.isClosed,
                tags: topic.tags,
                bannedUsersIds: topic.bannedUsersIds,
                blockedUserExceptions: topic.blockedUserExceptions
            });
        }
        return tree;
    } catch (error) {
        console.error('buildTree error:', error);
        return [];
    }

};

const getPostsForTopic = async (req, res) => {
    try {
        const {topicId} = req.params;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        let posts = await Post.find({topicId, isDeleted: false})
            .sort({createdAt: 1})       //surtowanie 1 to rosnąco, jak malejąco to -1
            .skip((page - 1) * limit)       //pomiń ileśtam rekordów po znalezieniu
            .limit(limit)               //pokaż tylko tyle ile limiit
            .populate('authorId', 'login');  //

        posts = posts.map(post => {
            const postObj = post.toObject();
            const likesSet = new Set((postObj.likes || []).map(id => id.toString ? id.toString() : String(id)));
            postObj.likes = Array.from(likesSet);
            return postObj;
        });

        const total = await Post.countDocuments({topicId, isDeleted: false});

        return res.status(200).json({message: `Lista postów dla tematu ${topicId}`, posts, page, total, pages: Math.ceil(total/limit)});


    } catch (err) {
        return res.status(500).json({message: "Problem z wylistowaniem postow dla danego tematu", err});
    }
};

const getTopicTree = async (req, res) => {
    try {
        const tree = await buildTree();

        return res.status(200).json({tree});
    } catch {
        return res.status(500).json({message: "Błąd przy pobieraniu drzewa tematów"});
    }
};

const getTopicSubtree = async (req, res) => {
    try {
        const topicId = req.params.id;
        const subtree = await buildTree(topicId);
        return res.status(200).json({tree: subtree});
    } catch (err) {
        return res.status(500).json({message: "Błąd przy pobieraniu poddrzewa"});
    }
}

module.exports = { createTopic, listRootTopics, getPostsForTopic, getTopicById, blockUserInTopic, unblockUserInTopic, getTopicTree, getTopicSubtree };