const router = require('express').Router();
const {isAdmin, isApproved} = require("../middleware/authMiddleware");
const {listRegisteredButNotAcceptedUsers, approveUser, blockUser, unblockUser, listBlockedUsers, listAllNonAdminUsers, deleteUser} = require("../controllers/adminController");
const passport = require('../passport');
const { adminLimiter } = require("../middleware/rateLimit");

router.use(passport.authenticate('jwt', { session: false }), isApproved, isAdmin);

router.get('/unapproved-users', listRegisteredButNotAcceptedUsers);
router.get('/blocked-users', listBlockedUsers);
router.get('/all-users', listAllNonAdminUsers);
router.post('/users/:id/approve', adminLimiter, approveUser);
router.post('/users/:id/block', adminLimiter, blockUser);
router.post('/users/:id/unblock', adminLimiter, unblockUser);
router.post('/users/delete', adminLimiter, deleteUser);

module.exports = router;
