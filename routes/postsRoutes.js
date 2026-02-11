const {createPost, toggleLike, deletePost, updatePost, getDeletedPosts} = require("../controllers/postController");
const router = require("express").Router();
const passport = require("../passport");
const {isApproved} = require("../middleware/authMiddleware");
const { writeLimiter } = require("../middleware/rateLimit");

router.use(passport.authenticate("jwt", {session: false}), isApproved);

router.post("/", writeLimiter, createPost);
router.put("/:postId", writeLimiter, updatePost);
router.post("/:postId/like", writeLimiter, toggleLike);
router.delete("/:postId", writeLimiter, deletePost);
router.get("/deleted/:topicId", getDeletedPosts);

module.exports = router;