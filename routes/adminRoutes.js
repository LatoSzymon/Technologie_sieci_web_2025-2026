const router = require('express').Router();
const {isAdmin, isApproved} = require("../middleware/authMiddleware");
const {listRegisteredButNotAcceptedUsers, approveUser, blockUser, unblockUser} = require("../controllers/adminController");
const passport = require('../passport');

router.use(passport.authenticate('jwt', { session: false }), isApproved, isAdmin);

router.get('/unapproved-users', listRegisteredButNotAcceptedUsers);
router.post('/users/:id/approve', approveUser);
router.post('/users/:id/block', blockUser);
router.post('/users/:id/unblock', unblockUser);

module.exports = router;

