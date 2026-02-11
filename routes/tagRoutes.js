const router = require('express').Router();
const {addTag, deleteTag, updateTag, getAllTags, getTagById, searchTags } = require("../controllers/tagControllers");
const { isAdmin, isApproved } = require('../middleware/authMiddleware');
const passport = require("../passport");
const { writeLimiter } = require("../middleware/rateLimit");

router.use(passport.authenticate('jwt', { session: false }), isApproved);

router.get("/", getAllTags);
router.get("/:id", getTagById);
router.post("/", writeLimiter, addTag);
router.delete("/:tagId", writeLimiter, deleteTag);
router.put("/:tagId", writeLimiter, updateTag);
router.get("/search", isAdmin, searchTags);

module.exports = router;