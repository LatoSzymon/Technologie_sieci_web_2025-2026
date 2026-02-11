const router = require("express").Router();
const passport = require("../passport");
const { isApproved, isAdmin } = require("../middleware/authMiddleware");
const { createTopic, closeTopic, openTopic, hideTopic, unhideTopic, listRootTopics, getTopicById, getPostsForTopic, blockUserInTopic, unblockUserInTopic, getTopicTree, getTopicSubtree, updateTopic, promoteModerator, removeModerator, transferTopicOwner, getEligibleUsersForModerator, getTopicUsers, getTopicParticipants, getLastReadPage, setLastReadPage } = require("../controllers/topicController");
const { writeLimiter } = require("../middleware/rateLimit");

router.use(passport.authenticate('jwt', { session: false }), isApproved);

router.get("/tree", getTopicTree);
router.get("/tree/:topicId", getTopicSubtree);
router.get("/", listRootTopics);
router.post("/", writeLimiter, createTopic);
router.get("/:topicId/posts", getPostsForTopic);
router.get("/:topicId/last-page", getLastReadPage);
router.post("/:topicId/last-page", writeLimiter, setLastReadPage);
router.get("/:topicId/eligible-users", getEligibleUsersForModerator);
router.get("/:topicId/users", getTopicUsers);
router.get("/:topicId/participants", getTopicParticipants);
router.get("/:topicId", getTopicById);
router.post("/block-user", writeLimiter, blockUserInTopic);
router.post("/unblock-user", writeLimiter, unblockUserInTopic);
router.post("/promote-moderator", writeLimiter, promoteModerator);
router.post("/remove-moderator", writeLimiter, removeModerator);
router.post("/transfer-owner", isAdmin, transferTopicOwner);
router.put("/:topicId", writeLimiter, updateTopic);

router.post('/close', writeLimiter, closeTopic);
router.post('/open', writeLimiter, openTopic);
router.post('/hide', writeLimiter, hideTopic);
router.post('/unhide', writeLimiter, unhideTopic);
module.exports = router;