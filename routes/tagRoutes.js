const router = require('express').Router();
const {addTag, deleteTag, updateTag, getAllTags, getTagById, searchTags } = require("../controllers/tagControllers");
const { isAdmin, isApproved } = require('../middleware/authMiddleware');
const passport = require("../passport");

router.use(passport.authenticate('jwt', { session: false }), isApproved);

router.get("/", getAllTags);
router.get("/:id", getTagById);
router.post("/", isAdmin, addTag);
router.delete("/:tagId", isAdmin, deleteTag);
router.put("/:tagId", isAdmin, updateTag);
router.get("/search", isAdmin, searchTags);

module.exports = router;