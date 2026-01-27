const router = require("express").Router();
const {register, login, logout, getMe, updateProfile, changePassword} = require('../controllers/usersController');
const passport = require('../passport');
const { isApproved } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get("/me", passport.authenticate('jwt', { session: false }), getMe);
router.post('/logout', passport.authenticate('jwt', { session: false }), logout);
router.put('/profile', passport.authenticate('jwt', { session: false }), updateProfile);
router.post('/change-password', passport.authenticate('jwt', { session: false }), changePassword);

module.exports = router;