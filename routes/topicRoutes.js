const router = require("express").Router();
const passport = require("../passport");
const { isApproved } = require("../middleware/authMiddleware");
const { createTopic, listRootTopics, getTopicById } = require("../controllers/topicController");

router.use(passport.authenticate('jwt', {session: false}), isApproved);

router.get("/", listRootTopics);
router.get("/:id", getTopicById);
router.post("/", createTopic);

module.exports = router;