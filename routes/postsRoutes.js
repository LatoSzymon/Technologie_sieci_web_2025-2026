const {createPost, toggleLike, deletePost, updatePost, getDeletedPosts} = require("../controllers/postController");
const router = require("express").Router();
const passport = require("../passport");
const {isApproved} = require("../middleware/authMiddleware");

router.use(passport.authenticate("jwt", {session: false}), isApproved);

router.post("/", createPost);
router.put("/:postId", updatePost);
router.post("/:postId/like", toggleLike);
router.delete("/:postId", deletePost);
router.get("/deleted/:topicId", getDeletedPosts);

module.exports = router;