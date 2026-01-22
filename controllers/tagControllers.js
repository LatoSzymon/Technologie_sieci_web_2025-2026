const {Tag} = require("../models/Tag");

const addTag = async (req, res) => {
    try {
        const tagName = req.body.name;
        const tag = new Tag({
            name: tagName
        });

        await tag.save();
        return res.status(201).json({message: "Tag dodany", tag});
    } catch (err) {
        return res.status(500).json({message: "Błąd przy dodawaniu tagu", err});
    }
};

const deleteTag = async (req, res) => {
    try {
        const tagId = req.params.tagId;
        const deleted = await Tag.findByIdAndDelete(tagId);
        return res.status(204).json({message: "Usunięto tag", deleted});
    } catch (err) {
        return res.status(500).json({message: "Usuwanie tagu nie powiodło się", err})
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
}