const router = require('express').Router();
const {auth, isAdmin} = require("../middleware/authMiddleware");
const {listRegisteredButNotAcceptedUsers, approveUser, blockUser, unblockUser} = require("../controllers/adminContol");

router.use(auth, isAdmin);

router.get('/unapproved-users', listRegisteredButNotAcceptedUsers);
router.post('/users/:id/approve', approveUser);
router.post('/users/:id/block', blockUser);
router.post('/users/:id/unblock');

module.exports = router;

