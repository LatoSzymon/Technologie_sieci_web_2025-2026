const {createPost, getPostsForTopic, toggleDislike, toggleLike, deletePost} = require("../controllers/postController");
const router = require("express").Router();
const passport = require("../passport");
const {isApproved} = require("../middleware/authMiddleware");

router.use(passport.authenticate("jwt", {session: false}), isApproved);

router.get("/:topicId/posts", getPostsForTopic);
router.post("/", createPost);
router.post("/:postId/like", toggleLike);
router.post("/:topicId/dislike", toggleDislike);
router.delete("/:postId", deletePost);

module.exports = router;