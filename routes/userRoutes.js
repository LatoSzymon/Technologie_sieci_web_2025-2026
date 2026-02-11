const router = require("express").Router();
const {register, login, logout, getMe, updateProfile, changePassword} = require('../controllers/usersController');
const passport = require('../passport');
const { isApproved } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get("/me", passport.authenticate('jwt', { session: false }), getMe);
router.post('/logout', passport.authenticate('jwt', { session: false }), logout);
router.put('/profile', passport.authenticate('jwt', { session: false }), updateProfile);
router.post('/change-password', authLimiter, passport.authenticate('jwt', { session: false }), changePassword);

module.exports = router;