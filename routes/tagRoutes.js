const router = require('express').Router();
const {addTag, deleteTag, updateTag, getAllTags, getTagById } = require("../controllers/tagControllers");
const { isAdmin } = require('../middleware/authMiddleware');
const passport = require("../passport");

router.use(passport.authenticate('jwt', { session: false }));

router.get("/", getAllTags);
router.get("/:id", getTagById);
router.post("/addTag", isAdmin, addTag);
router.delete("/:tagId", isAdmin, deleteTag);
router.put("/:tagId", isAdmin, updateTag);


module.exports = router;