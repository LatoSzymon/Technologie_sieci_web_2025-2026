require("dotenv").config();
const jwt = require('jsonwebtoken');
const User = require('../models/User');


const auth = (req, res, next) => {
    try {
        let token = req.cookies.jwt;

        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;

            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return res.status(401).json({ message: "Brak tokenu uwierzytelniającego. Dostęp zablokowany"});
        }

        const verified = jwt.verify(token, proccess.env.JWT_SECRET);

        req.user = {
            userId: decoded.userId,
            role: decoded.role
        };

        next();
    } catch (error) {
        return res.status(500).json({message: "Błąd przy autoryzacji tokenu", error});
    }
}