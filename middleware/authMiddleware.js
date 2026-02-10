require("dotenv").config();
const User = require('../models/User');


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

        if (user.isBlocked) {
            return res.status(403).json({message: "Konto zostało zawieszone przez administratora"});
        }

        next();
    } catch (err) {
        return res.status(500).json({message: "Nie udało się uwierzytelnić uzytkownika", err});
    }
}

module.exports = {isAdmin, isApproved};