//create, edit, delete, like, dislike

const Post = require("../models/Post");
const Topic = require("../models/Topic");

const createPost = async (req, res) => {
    try {
        const {topicId, content, code, tags} = req.body;
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

        if (topic.bannedUsersIds.some(i => authorId === i)) {
            return res.status(403).json({message:"Jestes zablokowany w tym temacie"});
        }

        const post = new Post({
            topicId, authorId, content, code: code || "", tags: tags || []
        })



        
    } catch (err) {
        return res.status(500).json({message: "Problem z utworzeniem posta", err});
    }
}