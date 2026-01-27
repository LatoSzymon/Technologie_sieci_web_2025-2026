const router = require('express').Router();
const {isAdmin, isApproved} = require("../middleware/authMiddleware");
const {listRegisteredButNotAcceptedUsers, approveUser, blockUser, unblockUser, listBlockedUsers, listAllNonAdminUsers, closeTopic, openTopic, hideTopic, unhideTopic, deleteUser} = require("../controllers/adminController");
const passport = require('../passport');

router.use(passport.authenticate('jwt', { session: false }), isApproved, isAdmin);

router.get('/unapproved-users', listRegisteredButNotAcceptedUsers);
router.get('/blocked-users', listBlockedUsers);
router.get('/all-users', listAllNonAdminUsers);
router.post('/users/:id/approve', approveUser);
router.post('/users/:id/block', blockUser);
router.post('/users/:id/unblock', unblockUser);
router.post('/users/delete', deleteUser);

router.post('/topics/close', closeTopic);
router.post('/topics/open', openTopic);
router.post('/topics/hide', hideTopic);
router.post('/topics/unhide', unhideTopic);

module.exports = router;
