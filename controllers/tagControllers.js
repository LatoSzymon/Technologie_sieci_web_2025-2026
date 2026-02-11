const Tag = require("../models/Tag");
const Post = require("../models/Post");
const Topic = require("../models/Topic");
const { tagSchema } = require("../validation/schemas");
const { validate } = require("../validation/validate");


const getAllTags = async (req, res) => {
    try {
        const allTags = await Tag.find();
        return res.status(200).json(allTags);
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
        const parsed = validate(tagSchema, req.body);
        if (!parsed.ok) {
            return res.status(400).json({ message: parsed.message });
        }

        const tagName = parsed.data.name;

        const exists = await Tag.findOne({ name: tagName });
        if (exists) { 
            return res.status(409).json({ message: "Tag już istnieje" });
        }

        const tag = new Tag({
            name: tagName
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
        const tag = await Tag.findByIdAndDelete(tagId);
         if (!tag) {
            return res.status(404).json({ message: "Tag z takim id? Coś takiego nie istnieje" });
        }

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
        const parsed = validate(tagSchema, payload);
        if (!parsed.ok) {
            return res.status(400).json({ message: parsed.message });
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