const router = require("express").Router();
const {register, login, logout, getMe} = require('../controllers/usersCotrol');
const {auth} = require('../middleware/authMiddleware');

router.post('/register', register);
router.get("/me", auth, getMe);
router.post('/login', login);
router.post('/logout', auth, logout)

module.exports = router;