const Topic = require('../models/Topic');
const User = require('../models/User');
const Post = require("../models/Post");
const Tag = require("../models/Tag");
const TopicParticipant = require("../models/TopicParticipant");

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
            const topicIdStr = topic._id.toString ? topic._id.toString() : String(topic._id);
            const isInAllowedList = exception.allowedInTopicIds.some(allowedId => {
                const allowedIdStr = allowedId.toString ? allowedId.toString() : String(allowedId);
                return allowedIdStr === topicIdStr;
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

        const isModerator = topic.ownerId.equals(currentUserId) || topic.moderatorsId.some(id => id.equals(currentUserId)) || req.user.role === "admin";
        if (!isModerator) {
            return res.status(403).json({ message: 'Tylko moderator lub admin może blokować użytkowników w tym temacie' });
        }

        const exceptTopicIdsStr = exceptTopicIds.map(id => id.toString());

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
                const subtopic = await Topic.findById(subtopicId);

                const isException = exceptTopicIdsStr.includes(subtopicId.toString());
                
                if (!isException) {
                    if (!subtopic.bannedUsersIds.some(id => id.equals(userId))) {
                        subtopic.bannedUsersIds.push(userId);
                    }
                } else {
                    subtopic.bannedUsersIds = subtopic.bannedUsersIds.filter(id => !id.equals(userId));
                    subtopic.blockedUserExceptions = (subtopic.blockedUserExceptions || []).filter(
                        exc => !exc.userId.equals(userId)
                    );
                }
                
                await subtopic.save();
            }
        }

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                const payload = {
                    userId,
                    topicId,
                    exceptTopicIds,
                    topic: {
                        _id: topic._id,
                        bannedUsersIds: topic.bannedUsersIds,
                        blockedUserExceptions: topic.blockedUserExceptions
                    }
                };
                io.to(`topic:${topicId}`).emit('topic:userBlocked', payload);
                io.to(`user:${userId}`).emit('topic:userBlocked', payload);
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

const listRootTopics = async (req, res) => {
    try {
        const parentId = req.query.parentId;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);

        const userId = req.user?.userId;
        const isAdmin = req.user?.role === 'admin';

        const filter = { parent: parentId ? parentId : null };

        if (!isAdmin) {
            filter.$or = [
                { isHidden: false },
                { ownerId: userId },
                { moderatorsId: userId }
            ];
        }

        const total = await Topic.countDocuments(filter);

        const topics = await Topic.find(filter)
            .populate("ownerId", "login mail")
            .populate("tags", "name")
            .select("-bannedUsersIds")
            .skip((page - 1) * limit)
            .limit(limit);

        return res.status(200).json({
            topics,
            page,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        return res.status(500).json({ message: "Błąd przy wylistowywaniu tematów-korzeni", error });
    }
};

const getTopicById = async (req, res) => {
    try {
        const id = req.params.topicId;
        const topic = await Topic.findById(id)
            .populate('ownerId', 'login mail isBlocked')
            .populate('moderatorsId', 'login mail')
            .populate('children', 'name description')
            .populate('tags');

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
                const payload = {
                    userId,
                    topicId,
                    topic: {
                        _id: topic._id,
                        bannedUsersIds: topic.bannedUsersIds,
                        blockedUserExceptions: topic.blockedUserExceptions
                    },
                    message: 'Zostałeś odblokowany w temacie'
                };
                io.to(`topic:${topicId}`).emit('topic:userUnblocked', payload);
                io.to(`user:${userId}`).emit('topic:userUnblocked', payload);
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
                _id: topic._id, 
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
            .populate('authorId', 'login email')
            .populate('tags')
            .populate({
                path: 'replyTo',
                populate: {
                    path: 'authorId',
                    select: 'login email'
                }
            });

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
        const topicId = req.params.topicId;
        const topic = await Topic.findById(topicId).populate('tags', 'name');
        
        if (!topic) {
            return res.status(404).json({message: "Temat nie istnieje"});
        }
        
        const children = await buildTree(topicId);
        
        const subtree = {
            _id: topic._id,
            name: topic.name,
            path: topic.path,
            children: children,
            isHidden: topic.isHidden,
            isClosed: topic.isClosed,
            tags: topic.tags,
            bannedUsersIds: topic.bannedUsersIds,
            blockedUserExceptions: topic.blockedUserExceptions
        };
        
        return res.status(200).json({tree: subtree});
    } catch (err) {
        console.error('getTopicSubtree error:', err);
        return res.status(500).json({message: "Błąd przy pobieraniu poddrzewa"});
    }
}

const updateTopic = async (req, res) => {
    try {
        const topicId = req.params.topicId;
        const userId = req.user.userId;
        const { name, description } = req.body;
        
        const topic = await Topic.findById(topicId);
        if (!topic) {
            return res.status(404).json({ message: "Temat nie istnieje" });
        }

        const isModerator = topic.ownerId.equals(userId) || 
                           topic.moderatorsId.some(id => id.equals(userId)) || 
                           req.user.role === "admin";
        
        if (!isModerator) {
            return res.status(403).json({ 
                message: "Tylko moderator lub admin może edytować temat" 
            });
        }
        
        if (name) topic.name = name;
        if (description !== undefined) topic.description = description;
        
        await topic.save();
        
        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.emit('topic:updated', { 
                    topicId: topic._id, 
                    action: 'updated', 
                    topic: {
                        _id: topic._id,
                        name: topic.name,
                        description: topic.description
                    }
                });
            }
        } catch (e) {
            console.error('WebSocket error (updateTopic):', e);
        }
        
        return res.status(200).json({ 
            message: "Temat został zaktualizowany", 
            topic 
        });
    } catch (error) {
        return res.status(500).json({ 
            message: "Błąd przy aktualizacji tematu", 
            error 
        });
    }
};

const promoteModerator = async (req, res) => {
    try {
        const { topicId, userId } = req.body;
        const currentUserId = req.user.userId;
        
        if (!topicId || !userId) {
            return res.status(400).json({ 
                message: "topicId i userId są wymagane" 
            });
        }
        
        const topic = await Topic.findById(topicId);
        if (!topic) {
            return res.status(404).json({ message: "Temat nie istnieje" });
        }

        const canPromote = topic.ownerId.equals(currentUserId) || req.user.role === "admin" || topic.moderatorsId.some(id => id.equals(currentUserId));
        if (!canPromote) {
            return res.status(403).json({ 
                message: "Tylko moderator tematu lub admin może promować moderatora" 
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Użytkownik nie istnieje" });
        }

        if (topic.moderatorsId.some(id => id.equals(userId))) {
            return res.status(409).json({ 
                message: "Ten użytkownik już jest moderatorem" 
            });
        }

        topic.moderatorsId.push(userId);
        await topic.save();

        const subtopics = await getAllSubtopics(topicId);
        if (subtopics.length > 0) {
            await Topic.updateMany(
                { _id: { $in: subtopics } },
                { $addToSet: { moderatorsId: userId } }
            );
        }
        
        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.to(`user:${userId}`).emit('moderator:promoted', {
                    topicId,
                    message: `Zostałeś moderatorem tematu: ${topic.name}`
                });
                io.to(`topic:${topicId}`).emit('topic:moderatorAdded', { 
                    userId, 
                    topicId 
                });
            }
        } catch (e) {
            console.error('WebSocket error (promoteModerator):', e);
        }
        
        return res.status(200).json({ 
            message: "Użytkownik został promowany na moderatora", 
            topic 
        });
    } catch (error) {
        return res.status(500).json({ 
            message: "Błąd przy promowaniu moderatora", 
            error 
        });
    }
};

const removeModerator = async (req, res) => {
    try {
        const { topicId, userId } = req.body;
        const currentUserId = req.user.userId;
        
        if (!topicId || !userId) {
            return res.status(400).json({ 
                message: "topicId i userId są wymagane" 
            });
        }
        
        const topic = await Topic.findById(topicId);
        if (!topic) {
            return res.status(404).json({ message: "Temat nie istnieje" });
        }

        const isModerator = topic.ownerId.equals(currentUserId) || 
                           topic.moderatorsId.some(id => id.equals(currentUserId)) || 
                           req.user.role === "admin";
        if (!isModerator) {
            return res.status(403).json({ 
                message: "Brak uprawnień do usunięcia moderatora" 
            });
        }

        if (topic.ownerId.equals(userId)) {
            return res.status(403).json({ 
                message: "Nie można usunąć właściciela tematu" 
            });
        }

        topic.moderatorsId = topic.moderatorsId.filter(id => !id.equals(userId));
        await topic.save();

        const subtopics = await getAllSubtopics(topicId);
        if (subtopics.length > 0) {
            await Topic.updateMany(
                { _id: { $in: subtopics } },
                { $pull: { moderatorsId: userId } }
            );
        }
        
        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.to(`user:${userId}`).emit('moderator:removed', {
                    topicId,
                    message: `Przestałeś być moderatorem tematu: ${topic.name}`
                });
                io.to(`topic:${topicId}`).emit('topic:moderatorRemoved', { 
                    userId, 
                    topicId 
                });
            }
        } catch (e) {
            console.error('WebSocket error (removeModerator):', e);
        }
        
        return res.status(200).json({ 
            message: "Moderator został usunięty", 
            topic 
        });
    } catch (error) {
        return res.status(500).json({ 
            message: "Błąd przy usuwaniu moderatora", 
            error 
        });
    }
};

const transferTopicOwner = async (req, res) => {
    try {
        const { topicId, userId } = req.body;

        if (!topicId || !userId) {
            return res.status(400).json({
                message: "topicId i userId są wymagane"
            });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                message: "Tylko administrator może zmienić właściciela tematu"
            });
        }

        const topic = await Topic.findById(topicId);
        if (!topic) {
            return res.status(404).json({ message: "Temat nie istnieje" });
        }

        if (topic.ownerId.equals(userId)) {
            return res.status(409).json({ message: "Ten użytkownik już jest właścicielem" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Użytkownik nie istnieje" });
        }

        if (user.isBlocked) {
            return res.status(409).json({ message: "Nie można nadać roli właściciela zablokowanemu użytkownikowi" });
        }

        if (!topic.moderatorsId.some(id => id.equals(userId))) {
            return res.status(409).json({ message: "Nowy właściciel musi być moderatorem tematu" });
        }

        topic.ownerId = userId;
        topic.moderatorsId = topic.moderatorsId.filter(id => !id.equals(userId));
        await topic.save();

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.to(`topic:${topicId}`).emit('topic:updated', {
                    topicId: topic._id,
                    action: 'owner-changed',
                    topic: {
                        _id: topic._id,
                        ownerId: topic.ownerId,
                        moderatorsId: topic.moderatorsId
                    }
                });
            }
        } catch (e) {
            console.error('WebSocket error (transferTopicOwner):', e);
        }

        return res.status(200).json({
            message: "Właściciel tematu został zmieniony",
            topic
        });
    } catch (error) {
        return res.status(500).json({
            message: "Błąd przy zmianie właściciela tematu",
            error
        });
    }
};

const getEligibleUsersForModerator = async (req, res) => {
    try {
        const { topicId } = req.params;
        const currentUserId = req.user.userId;

        if (!topicId) {
            return res.status(400).json({ message: "topicId jest wymagane" });
        }

        const topic = await Topic.findById(topicId);
        if (!topic) {
            return res.status(404).json({ message: "Temat nie istnieje" });
        }

        const isOwner = topic.ownerId.equals(currentUserId);
        const isModerator = topic.moderatorsId.some(id => id.equals(currentUserId));
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isModerator && !isAdmin) {
            return res.status(403).json({ 
                message: "Nie masz uprawnień do promowania moderatorów w tym temacie" 
            });
        }

        const currentModerators = topic.moderatorsId.map(id => id.toString());
        const topicOwner = topic.ownerId.toString();

        const users = await User.find({
            _id: {
                $nin: [...currentModerators, topicOwner],
                $ne: currentUserId
            },
            isApprovedByAdmin: true,
            isBlocked: false
        }).select('_id login mail').sort({ login: 1 });

        return res.status(200).json({ users });
    } catch (error) {
        return res.status(500).json({ 
            message: "Błąd przy pobieraniu użytkowników", 
            error 
        });
    }
};

const getTopicUsers = async (req, res) => {
    try {
        const { topicId } = req.params;
        const currentUserId = req.user.userId;

        const topic = await Topic.findById(topicId);
        if (!topic) {
            return res.status(404).json({ 
                message: "Temat nie istnieje" 
            });
        }

        const isOwner = topic.ownerId.equals(currentUserId);
        const isModerator = topic.moderatorsId.some(id => id.equals(currentUserId));
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isModerator && !isAdmin) {
            return res.status(403).json({ 
                message: "Nie masz uprawnień do blokowania użytkowników w tym temacie" 
            });
        }

        const users = await User.find({
            isApprovedByAdmin: true,
            isBlocked: false
        }).select('_id login mail').sort({ login: 1 });

        return res.status(200).json({ users });
    } catch (error) {
        return res.status(500).json({ 
            message: "Błąd przy pobieraniu użytkowników", 
            error 
        });
    }
};

const getTopicParticipants = async (req, res) => {
    try {
        const { topicId } = req.params;
        const currentUserId = req.user.userId;

        if (!topicId) {
            return res.status(400).json({ message: "topicId jest wymagane" });
        }

        const topic = await Topic.findById(topicId);
        if (!topic) {
            return res.status(404).json({ message: "Temat nie istnieje" });
        }

        const isOwner = topic.ownerId.equals(currentUserId);
        const isModerator = topic.moderatorsId.some(id => id.equals(currentUserId));
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isModerator && !isAdmin) {
            return res.status(403).json({
                message: "Nie masz uprawnień do listy uczestników tematu"
            });
        }

        const subtopics = await getAllSubtopics(topicId);
        const topicIds = [topicId, ...subtopics];

        const participants = await TopicParticipant.find({
            topicId: { $in: topicIds }
        })
            .populate('userId', 'login mail role')
            .lean();

        const excludedIds = new Set([
            topic.ownerId.toString(),
            ...topic.moderatorsId.map(id => id.toString())
        ]);

        const usersMap = new Map();
        for (const participant of participants) {
            const user = participant.userId;
            if (!user) continue;
            if (user.role === 'admin') continue;
            const userIdStr = user._id.toString();
            if (excludedIds.has(userIdStr)) continue;
            if (!usersMap.has(userIdStr)) {
                usersMap.set(userIdStr, {
                    _id: user._id,
                    login: user.login,
                    mail: user.mail
                });
            }
        }

        const users = Array.from(usersMap.values()).sort((a, b) =>
            a.login.localeCompare(b.login, 'pl')
        );

        return res.status(200).json({ users });
    } catch (error) {
        return res.status(500).json({
            message: "Błąd przy pobieraniu uczestników tematu",
            error
        });
    }
};

const closeTopic = async (req, res) => {
    try {
        const {topicId} = req.body;
        const user = req.user;

        if (!topicId) {
            return res.status(400).json({message: "Nie podano ID tematu"});
        }

        const topic = await Topic.findById(topicId);

        if (!topic) {
            return res.status(404).json({message: "Temat nie znaleziony"});
        }

        if (topic.isClosed) {
            return res.status(409).json({message: "Temat jest już zamknięty"});
        }

        const canChange = topic.ownerId.equals(user.userId) || topic.moderatorsId.some(id => id.equals(user.userId)) || user.role === 'admin';

        if (!canChange) {
            return res.status(403).json({message: "Nie masz do tego uprawnień"});
        }

        topic.isClosed = true;
        await topic.save();

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                const payload = {topicId, parentId: topic.parent, message: "Ten temat został zamknięty"}
                io.to(`topic:${topicId}`).emit('topic:closed', payload);
                io.emit('topic:closed', payload);
            }
        } catch (e) {
            console.error('WebSocket error (closeTopic):', e);
        }

        return res.status(200).json({message: "Temat zamknięty", topic});
    } catch (err) {
        return res.status(500).json({message: "Błąd zamykania tematu", err});
    }
};

const openTopic = async (req, res) => {
    try {
        const {topicId} = req.body;
        const userId = req.user.userId;

        if (!topicId) {
            return res.status(400).json({message: "Nie podano ID tematu"});
        }

        const topic = await Topic.findById(topicId);

        if (!topic) {
            return res.status(404).json({message: "Temat nie znaleziony"});
        }

        if (!topic.isClosed) {
            return res.status(409).json({message: "Temat jest już otwarty"});
        }

        const isModerator = topic.ownerId.equals(userId) ||
            topic.moderatorsId.some(id => id.equals(userId)) ||
            req.user.role === 'admin';

        if (!isModerator) {
            return res.status(403).json({message: "Nie masz do tego uprawnień"});
        }

        topic.isClosed = false;
        await topic.save();

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                const payload = {topicId, parentId: topic.parent, message: "Ten temat został otwarty"}
                io.to(`topic:${topicId}`).emit('topic:opened', payload);
                io.emit('topic:opened', payload)
            }
        } catch (e) {
            console.error('WebSocket error (openTopic):', e);
        }

        return res.status(200).json({message: "Temat otwarty", topic});
    } catch (err) {
        return res.status(500).json({message: "Błąd otwierania tematu", err});
    }
};

const hideTopic = async (req, res) => {
    try {
        const {topicId} = req.body;
        const userId = req.user.userId;

        if (!topicId) {
            return res.status(400).json({message: "Nie podano ID tematu"});
        }

        const topic = await Topic.findById(topicId);

        if (!topic) {
            return res.status(404).json({message: "Temat nie znaleziony"});
        }

        if (topic.isHidden) {
            return res.status(409).json({message: "Temat jest już ukryty"});
        }

        const isModerator = topic.ownerId.equals(userId) ||
            topic.moderatorsId.some(id => id.equals(userId)) ||
            req.user.role === 'admin';

        if (!isModerator) {
            return res.status(403).json({message: "Nie masz do tego uprawnień"});
        }

        topic.isHidden = true;
        await topic.save();

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                const payload = { topicId, parentId: topic.parent, message: 'Ten temat został ukryty' };
                io.to(`topic:${topicId}`).emit('topic:hidden', payload);
                io.emit('topic:hidden', payload);
            }
        } catch (e) {
            console.error('WebSocket error (hideTopic):', e);
        }

        return res.status(200).json({message: "Temat ukryty", topic});
    } catch (err) {
        return res.status(500).json({message: "Błąd ukrywania tematu", err});
    }
};

const unhideTopic = async (req, res) => {
    try {
        const {topicId} = req.body;
        const userId = req.user.userId;

        if (!topicId) {
            return res.status(400).json({message: "Nie podano ID tematu"});
        }

        const topic = await Topic.findById(topicId);

        if (!topic) {
            return res.status(404).json({message: "Temat nie znaleziony"});
        }

        if (!topic.isHidden) {
            return res.status(409).json({message: "Temat nie jest ukryty"});
        }

        const isModerator = topic.ownerId.equals(userId) ||
            topic.moderatorsId.some(id => id.equals(userId)) ||
            req.user.role === 'admin';

        if (!isModerator) {
            return res.status(403).json({message: "Nie masz do tego uprawnień"});
        }

        topic.isHidden = false;
        await topic.save();

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                const payload = {topicId, parentId: topic.parent, message: "Ten temat jest teraz widoczny"}
                io.to(`topic:${topicId}`).emit('topic:unhidden', payload);
                io.emit('topic:unhidden', payload);
            }
        } catch (e) {
            console.error('WebSocket error (unhideTopic):', e);
        }

        return res.status(200).json({message: "Temat odkryty", topic});
    } catch (err) {
        return res.status(500).json({message: "Błąd odkrywania tematu", err});
    }
};

module.exports = { createTopic, listRootTopics, getPostsForTopic, getTopicById, blockUserInTopic, unblockUserInTopic, getTopicTree, getTopicSubtree, updateTopic, promoteModerator, removeModerator, transferTopicOwner, getEligibleUsersForModerator, getTopicUsers, getTopicParticipants, closeTopic, openTopic, hideTopic, unhideTopic, getAllSubtopics };