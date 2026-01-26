require("dotenv").config();
const User = require("../models/User");
const Topic = require("../models/Topic");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


const register = async (req, res) => {
    try {
        const { mail, login, password, confirmPassword } = req.body;

        if (!mail || !login || !password || !confirmPassword) {
            return res.status(400).json({ message: "mail, login, password i confirmPassword są wymagane" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Hasła nie są identyczne" });
        }

        const exists = await User.findOne({ $or: [{ mail }, { login }] });
        if (exists) {
            return res.status(409).json({ message: "Użytkownik z takim mailem lub loginem już istnieje" });
        }

        const hash = await bcrypt.hash(password, 12);

        const user = new User({
            mail,
            login,
            hash,
            role: "user",
            isApprovedByAdmin: false,
        });

        await user.save();

        // WebSocket admin notification
        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.to('admins').emit('admin:notify', {
                    type: 'new-user',
                    login: user.login,
                    mail: user.mail,
                    userId: user._id,
                    message: `Nowa rejestracja: ${user.login} (${user.mail})`
                });
            }
        } catch (e) {
            console.error('WebSocket admin notify (register) error:', e);
        }

        return res.status(201).json({ message: "Konto utworzone. Czeka na akceptację administratora." });
    } catch (err) {
        console.error(err);
        
        return res.status(500).json({message: "Błąd podczas rejestracji", err});
    }
};

const login = async (req, res) => {
    try {
        const { loginOrEmail, password } = req.body;

        if (!loginOrEmail || !password) {
            return res.status(400).json({ message: "Podaj login lub email oraz hasło" });
        }

        const user = await User.findOne({
            $or: [
                { mail: loginOrEmail },
                { login: loginOrEmail }
            ]
        });

        if (!user) {
            return res.status(401).json({ message: "Nieprawidłowe dane logowania" });
        }

        const passwordOk = await bcrypt.compare(password, user.hash);

        if (!passwordOk) {
            return res.status(401).json({ message: "Nieprawidłowe dane logowania, hasło nieok" });
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: "Konto zostało zablokowane przez administratora" });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "100m" }
        );

        res.cookie("jwt", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 100 * 60 * 1000,
        });

        return res.status(200).json({ message: "Zalogowano", token });
    } catch (error) {
        return res.status(500).json({ message: "Błąd podczas logowania", error: error?.message });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-hash');

        if (!user) {
            return res.status(404).json({message: 'Takiego użytkownika nie ma'});
        }

        return res.status(200).json({user});
    } catch (eror) {
        return res.status(500).json({message: "Błąd przy komunikacji z serwerem", eror});
    }
};

const logout = (req, res) => {
    res.clearCookie("jwt", {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    });

    return res.status(200).json({message: "Wylogowano"});
};

module.exports = { register, login, getMe, logout };

