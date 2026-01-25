const router = require("express").Router();
const passport = require("../passport");
const { isApproved } = require("../middleware/authMiddleware");
const { createTopic, listRootTopics, getTopicById, getPostsForTopic, blockUserInTopic, unblockUserInTopic, getTopicTree, getTopicSubtree } = require("../controllers/topicController");

router.use(passport.authenticate('jwt', { session: false }), isApproved);

router.get("/tree", getTopicTree);
router.get("/tree/:id", getTopicSubtree);
router.get("/", listRootTopics);
router.get("/:id", getTopicById);
router.get("/:topicId/posts", getPostsForTopic);
router.post("/", createTopic);
router.post("/block-user", blockUserInTopic);
router.post("/unblock-user", unblockUserInTopic);
module.exports = router;