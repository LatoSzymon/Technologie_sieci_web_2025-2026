const Tag = require("../models/Tag");
const Post = require("../models/Post");
const Topic = require("../models/Topic");
const { createTagSchema, updateTagSchema } = require("../validation/schemas");
const { validate } = require("../validation/validate");
const { getRootTopicId, isUserModeratorForRoot, getAllowedTagsForTopic } = require("../services/tagScope");


const getAllTags = async (req, res) => {
    try {
        const topicId = req.query.topicId;
        const includeAll = req.query.all === "true" && req.user?.role === "admin";

        if (includeAll) {
            const allTags = await Tag.find();
            return res.status(200).json(allTags);
        }

        if (topicId) {
            const tags = await getAllowedTagsForTopic(topicId);
            return res.status(200).json(tags);
        }

        const globalTags = await Tag.find({ scope: "global" });
        return res.status(200).json(globalTags);
    } catch (err) {
        console.error(err);
        return res.status(500).json({message: "Błąd przy pobieraniu tagow", err});
    }
};

const getTagById = async (req, res) => {
    try {
        const id = req.params.id;
        const tag = await Tag.findById(id);
        return res.status(200).json(tag);
    } catch (err) {
        return res.status(500).json({message: "Błąd przy pobieraniu tagu", err});
    }
};

const addTag = async (req, res) => {
    try {
        const parsed = validate(createTagSchema, req.body);
        if (!parsed.ok) {
            return res.status(400).json({ message: parsed.message });
        }

        const tagName = parsed.data.name;
        const topicId = parsed.data.topicId || null;

        const isAdmin = req.user?.role === "admin";
        let scope = "global";
        let topicRootId = null;

        if (!isAdmin) {
            if (!topicId) {
                return res.status(403).json({ message: "Wymagany temat dla tagow moderatora" });
            }
            const rootId = await getRootTopicId(topicId);
            if (!rootId) {
                return res.status(404).json({ message: "Temat nie istnieje" });
            }
            const canManage = await isUserModeratorForRoot(req.user.userId, rootId);
            if (!canManage) {
                return res.status(403).json({ message: "Brak uprawnien do tagow w tym drzewie" });
            }
            scope = "topic";
            topicRootId = rootId;
        }

        if (isAdmin && topicId) {
            const rootId = await getRootTopicId(topicId);
            if (!rootId) {
                return res.status(404).json({ message: "Temat nie istnieje" });
            }
            scope = "topic";
            topicRootId = rootId;
        }

        const exists = await Tag.findOne({ name: tagName, scope, topicRootId });
        if (exists) { 
            return res.status(409).json({ message: "Tag już istnieje" });
        }

        const tag = new Tag({
            name: tagName,
            scope,
            topicRootId
        });

        await tag.save();

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.emit('tag:created', { tagId: tag._id, tag });
            }
        } catch (e) {
            console.error('WebSocket error (addTag):', e);
        }

        return res.status(201).json({message: "Tag dodany", tag});
    } catch (err) {
        console.error(err);
        return res.status(500).json({message: "Błąd przy dodawaniu tagu", err});
    }
};

const deleteTag = async (req, res) => {
    try {
        const tagId = req.params.tagId;
        const existing = await Tag.findById(tagId);
        if (!existing) {
            return res.status(404).json({ message: "Tag z takim id? Coś takiego nie istnieje" });
        }

        if (existing.scope === "global" && req.user?.role !== "admin") {
            return res.status(403).json({ message: "Brak uprawnien do usuwania tagow globalnych" });
        }

        if (existing.scope === "topic" && req.user?.role !== "admin") {
            const canManage = await isUserModeratorForRoot(req.user.userId, existing.topicRootId);
            if (!canManage) {
                return res.status(403).json({ message: "Brak uprawnien do usuwania tego tagu" });
            }
        }

        const tag = await Tag.findByIdAndDelete(tagId);

        await Post.updateMany(
            { tags: tag._id },
            { $pull: { tags: tag._id } }
        );

        await Topic.updateMany(
            { tags: tag._id },
            { $pull: { tags: tag._id } }
        );

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.emit('tag:deleted', { tagId });
            }
        } catch (e) {
            console.error('WebSocket error (deleteTag):', e);
        }

        return res.status(204).json({message: "Usunięto tag"});
    } catch (err) {
        console.error(err);
        return res.status(500).json({message: "Usuwanie tagu nie powiodło się", err});
    }
};

const updateTag = async (req, res) => {
    try {
        const tagId = req.params.tagId;
        const payload = { name: req.body.name || req.body.newName };
        const parsed = validate(updateTagSchema, payload);
        if (!parsed.ok) {
            return res.status(400).json({ message: parsed.message });
        }

        const existing = await Tag.findById(tagId);
        if (!existing) {
            return res.status(404).json({ message: "Tag nie istnieje" });
        }

        if (existing.scope === "global" && req.user?.role !== "admin") {
            return res.status(403).json({ message: "Brak uprawnien do edycji tagu globalnego" });
        }

        if (existing.scope === "topic" && req.user?.role !== "admin") {
            const canManage = await isUserModeratorForRoot(req.user.userId, existing.topicRootId);
            if (!canManage) {
                return res.status(403).json({ message: "Brak uprawnien do edycji tego tagu" });
            }
        }

        const dup = await Tag.findOne({
            _id: { $ne: tagId },
            name: parsed.data.name,
            scope: existing.scope,
            topicRootId: existing.topicRootId
        });

        if (dup) {
            return res.status(409).json({ message: "Tag o tej nazwie juz istnieje" });
        }

        const updated = await Tag.findByIdAndUpdate(tagId, {name: parsed.data.name}, {new: true});

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.emit('tag:updated', { tagId, tag: updated });
            }
        } catch (e) {
            console.error('WebSocket error (updateTag):', e);
        }

        return res.status(201).json({message: "Zaktualizowano tag", updated})
    } catch (err) {
        return res.status(500).json({message: "Aktualizacja tagu się nie powiodła", updated});
    }
};

const searchTags = async (req, res) => {
    try {
        const q = req.query.name || "";
        const tags = await Tag.find({ name: { $regex: q, $options: "i" } });
        return res.status(200).json(tags);
    } catch (err) {
        return res.status(500).json({ message: "Błąd wyszukiwania tagów", err });
    }
};


module.exports = {addTag, deleteTag, updateTag, getAllTags, getTagById, searchTags};