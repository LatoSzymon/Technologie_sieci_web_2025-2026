const router = require("express").Router();
const passport = require("../passport");
const { isApproved } = require("../middleware/authMiddleware");
const { createTopic, closeTopic, openTopic, hideTopic, unhideTopic, listRootTopics, getTopicById, getPostsForTopic, blockUserInTopic, unblockUserInTopic, getTopicTree, getTopicSubtree, updateTopic, promoteModerator, removeModerator, getEligibleUsersForModerator, getTopicUsers, getTopicParticipants } = require("../controllers/topicController");

router.use(passport.authenticate('jwt', { session: false }), isApproved);

router.get("/tree", getTopicTree);
router.get("/tree/:topicId", getTopicSubtree);
router.get("/", listRootTopics);
router.post("/", createTopic);
router.get("/:topicId/posts", getPostsForTopic);
router.get("/:topicId/eligible-users", getEligibleUsersForModerator);
router.get("/:topicId/users", getTopicUsers);
router.get("/:topicId/participants", getTopicParticipants);
router.get("/:topicId", getTopicById);
router.post("/block-user", blockUserInTopic);
router.post("/unblock-user", unblockUserInTopic);
router.post("/promote-moderator", promoteModerator);
router.post("/remove-moderator", removeModerator);
router.put("/:topicId", updateTopic);

router.post('/close', closeTopic);
router.post('/open', openTopic);
router.post('/hide', hideTopic);
router.post('/unhide', unhideTopic);
module.exports = router;