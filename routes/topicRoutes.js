const router = require("express").Router();
const passport = require("../passport");
const {createTopic, listRootTopics, getTopicById} = require("../controllers/topicControl");

router.get("/", passport.authenticate('jwt', {session: false}), listRootTopics);
router.get("/:id", passport.authenticate('jwt', {session: false}), getTopicById);
router.post("/", passport.authenticate('jwt', {session: false}), createTopic);

module.exports = router;