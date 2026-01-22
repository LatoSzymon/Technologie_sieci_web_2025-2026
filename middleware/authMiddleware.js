require("dotenv").config();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

//Useless?
// const auth = (req, res, next) => {
//     try {
//         let token = req.cookies.jwt;

//         if (!token && req.headers.authorization) {
//             const authHeader = req.headers.authorization;

//             if (authHeader.startsWith('Bearer ')) {
//                 token = authHeader.substring(7);
//             }
//         }

//         if (!token) {
//             return res.status(401).json({ message: "Brak tokenu uwierzytelniającego. Dostęp zablokowany"});
//         }

//         const verified = jwt.verify(token, proccess.env.JWT_SECRET);

//         req.user = {
//             userId: decoded.userId,
//             role: decoded.role
//         };

//         next();
//     } catch (error) {
//         return res.status(500).json({message: "Błąd przy autoryzacji tokenu", error});
//     }
// };

const isAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({message: "Odmowa dostępu. Tresci tylko dla adminów"});
    }
    next();
}

const isApproved = async (req, res, next) => {
    try {
        const id = req.user.userId;
        const user = await User.findById(id);

        if (!user) {
            return res.status(401).json({ message: "Nie znaleziono użytkownika" });
        }
        if (!user.isApprovedByAdmin) {
            return res.status(403).json({ message: "Konto nie zostało jeszcze zaakceptowane przez administratora" });
        }

        next();
    } catch (err) {
        return res.status(500).json({message: "Nie udało się uwierzytelnić uzytkownika", err});
    }
}

module.exports = {isAdmin, isApproved};