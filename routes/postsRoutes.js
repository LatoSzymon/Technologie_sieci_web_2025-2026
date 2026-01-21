const {createPost, getPostsForTopic, toggleDislike, toggleLike, deletePost} = require("../controllers/postController");
const router = require("express").Router();
const passport = require("../passport");

router.get("/:topicId/posts", getPostsForTopic);
router.post("/", passport.authenticate("jwt", {session: false}), createPost);
router.post("/:postId/like", passport.authenticate("jwt", {session: false}), toggleLike);
router.post("/:topicId/dislike", passport.authenticate("jwt", {session: false}), toggleDislike);
router.delete("/:postId", passport.authenticate("jwt", {session: false}), deletePost);

module.exports = router;