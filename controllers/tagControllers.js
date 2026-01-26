const Tag = require("../models/Tag");
const Post = require("../models/Post");
const Topic = require("../models/Topic");


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
        const tagName = req.body.name;

        if (!tagName) {
            return res.status(400).json({ message: "Brak nazwy tagu" });
        }

        const exists = await Tag.findOne({ name: tagName });
        if (exists) { 
            return res.status(409).json({ message: "Tag już istnieje" });
        }

        const tag = new Tag({
            name: tagName
        });

        await tag.save();
        return res.status(201).json({message: "Tag dodany", tag});
    } catch (err) {
        console.error(err);
        return res.status(500).json({message: "Błąd przy dodawaniu tagu", err});
    }
};

const deleteTag = async (req, res) => {
    try {
        const tagId = req.params.tagId;
        const deleted = await Tag.findByIdAndDelete(tagId);
         if (!tag) {
            return res.status(404).json({ message: "Tag z takim id? Coś takiego nie istnieje" });
        }

        await Post.updateMany(
            { tags: tag.name },
            { $pull: { tags: tag.name } }
        );

        await Topic.updateMany(
            { tags: tag.name },
            { $pull: { tags: tag.name } }
        );
        return res.status(204).json({message: "Usunięto tag", deleted});
    } catch (err) {
        console.error(err);
        return res.status(500).json({message: "Usuwanie tagu nie powiodło się", err});
    }
};

const updateTag = async (req, res) => {
    try {
        const tagId = req.params.tagId;
        const newName = req.body.newName;
        const updated = await Tag.findByIdAndUpdate(tagId, {name: newName}, {new: true});
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