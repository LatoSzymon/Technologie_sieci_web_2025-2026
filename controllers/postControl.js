//create, edit, delete, like, dislike

const Post = require("../models/Post");
const Topic = require("../models/Topic");
const { post } = require("../routes/userRoutes");

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
            topicId, authorId, content, tags: tags || []
        });

        await post.save();
        return res.status(201).json({message: "Utworzono post", post});

        
    } catch (err) {
        return res.status(500).json({message: "Problem z utworzeniem posta", err});
    }
}

const getPostsForTopic = async (req, res) => {
    try {
        const {topicId} = req.params;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const posts = await Post.find({topicId, isDeleted: false})
            .sort({createdAt: 1})       //surtowanie 1 to rosnąco, jak malejąco to -1
            .skip((page - 1) * limit)       //pomiń ileśtam rekordów po znalezieniu
            .limit(limit)               //pokaż tylko tyle ile limiit
            .populate('authorId', 'login');  //

        const total = await Post.countDocuments({topicId, isDeleted: false});

        return res.status(200).json({message: `Lista postów dla tematu ${topicId}`, post, page, total, pages: Math.ceil(total/limit)});


    } catch (err) {
        return res.status(500).json({message: "Problem z wylistowaniem postow dla danego tematu", err});
    }
}

const toggleLike = async (req, res) => {
    try {
        const {postId} = req.body;
        const userId = req.user.userId;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({message: "Nie znaleziono posta"});
        }

        const liked = post.likes.some(id => id === userId);
        const disliked = post.dislikes.some(id => id === userId);

        if (disliked) {
            return res.status(403).json({message: "Nie polubisz nielubionego posta geniuszu"});
        }

        if (liked) {
            post.likes.pull(userId);
        } else {
            post.likes.push(userId);
        } 

        return res.status(200).json({message: "Poprawna zmiana stanu like'owania", liked});

    } catch (err) {
        return res.status(500).json({message: "Nie udało się dodać like", err});
    }
}

const toggleDislike = async (req, res) => {
    try {
        const {postId} = req.body;
        const userId = req.user.userId;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({message: "Nie znaleziono posta"});
        }

        const liked = post.likes.some(id => id === userId);
        const disliked = post.dislikes.some(id => id === userId);

        if (liked) {
            return res.status(403).json({message: "Nie znielubisz lubionego posta geniuszu"});
        }

        if (disliked) {
            post.likes.pull(userId);
        } else {
            post.likes.push(userId);
        } 

        return res.status(200).json({message: "Poprawna zmiana stanu like'owania", disliked});

    } catch (err) {
        return res.status(500).json({message: "Nie udało się dodać dislike", err});
    }
}

const deletePost = async (req, res) => {
    try {
        const {postId} = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        const post = Post.findById(postId);

        if (!post) {
            return res.status(404).json({message: "Nie udało się znaleźć posta o tym id"});    
        }

        if (userRole === "admin" || userId === post.authorId) {
            post.isDeleted = true;
            await post.save();
             return res.status(200).json({message: "Usunięto post", post});
        } else {
             return res.status(403).json({message: "Aniś admin, ani właściciel posta"});
        }



    } catch (err) {
        return res.status(500).json({message: "Błąd usuwania posta", err});
    }
}

module.exports = {createPost, getPostsForTopic, toggleDislike, toggleLike, deletePost};