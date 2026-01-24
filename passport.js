require("dotenv").config();
const passport = require('passport');
const {Strategy: JwtStrategy, ExtractJwt} = require('passport-jwt');
const User = require('./models/User');

const opts = {
    jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        req => req.cookies?.jwt
    ]), secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(opts, async (payload, done) => {
    try {
        const user = await User.findById(payload.userId);
        if (user) {
            return done(null, {userId: user.id, role: user.role});
        } else {
            return done(null, false);
        }
    } catch (err) {
        console.error(err);
        return done(err, false);
    }
}));

module.exports = passport;