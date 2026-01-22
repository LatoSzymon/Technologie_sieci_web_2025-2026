const router = require("express").Router();
const {register, login, logout, getMe} = require('../controllers/usersController');
const passport = require('../passport');
const { isApproved } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get("/me", passport.authenticate('jwt', { session: false }), getMe);
router.post('/logout', passport.authenticate('jwt', { session: false }), logout)

module.exports = router;