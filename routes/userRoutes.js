const router = require("express").Router();
const {register, login, logout, getMe} = require('../controllers/usersCotrol');
const passport = require('../passport');

router.post('/register', register);
router.get("/me", passport.authenticate('jwt', { session: false }), getMe);
router.post('/login', login);
router.post('/logout', passport.authenticate('jwt', { session: false }), logout)

module.exports = router;