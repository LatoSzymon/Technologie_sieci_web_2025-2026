const Topic = require('../models/Topic');
const User = require('../models/User');

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

const blockUserInTopic = async (req, res) => {
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

        const isModerator = topic.ownerId.equals(currentUserId) || topic.moderatorsId.some(id => id.equals(currentUserId) || req.user.role === "admin");
        if (!isModerator) {
            return res.status(403).json({ message: 'Tylko moderator lub admin może blokować użytkowników w tym temacie' });
        }

        if (!topic.bannedUsersIds.some(id => id.equals(userId))) {
            topic.bannedUsersIds.push(userId);
            await topic.save();
        }

        const subtopics = await getAllSubtopics(topicId);

        if (subtopics.length > 0) {
            await Topic.updateMany(
                { _id: { $in: subtopics }, bannedUsersIds: { $ne: userId } },
                { $push: { bannedUsersIds: userId } }
            );
        }
        return res.status(200).json({ message: 'Użytkownik zablokowany w temacie i podtematach' });
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

        let parent = null;
        if (parentId) {
            parent = await Topic.findById(parentId);

            if (!parent) {
                return res.status(404).json({message: "Podany temat nadrzędny nie istnieje"});
            }

            const isModerator = parent.ownerId.equals(userId) || parent.moderatorsId.some(id => id.equals(userId));
            if (!isModerator) {
                return res.status(403).json({message: "Odmowa dostępu. Użytkowmin musi być moderatorem tematu nadrzędnego"});
            }
        }

        const inheritModeratorsId = parent ? [...parent.moderatorsId, parent.ownerId] : [];

        const topic = new Topic({
            name, description: description || '', tags: tags || [], ownerId: userId,
            moderatorsId: inheritModeratorsId.filter(id => !id.equals(userId)), parent: parentId || null
        })

        await topic.save();

        if (parent) {
            parent.children.push(topic._id);
            await parent.save();
        }

        await User.findByIdAndUpdate(userId, { $push: { OwnedTopics: topic._id } });
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
            await topic.save();
        }

        const subtopics = await getAllSubtopics(topicId);

        if (subtopics.length > 0) {
            await Topic.updateMany(
                { _id: { $in: subtopics } },
                { $pull: { bannedUsersIds: userId } }
            );
        }
        return res.status(200).json({ message: 'Użytkownik odblokowany w temacie i podtematach' });
    } catch (error) {
        return res.status(500).json({ message: 'Błąd odblokowywania użytkownika', error: error.message });
    }
};

module.exports = { createTopic, listRootTopics, getTopicById, blockUserInTopic, unblockUserInTopic };