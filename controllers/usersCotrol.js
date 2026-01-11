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
        return res.status(201).json({ message: "Konto utworzone. Czeka na akceptację administratora." });
    } catch (err) {
        return res.status(500).json({message: "Błąd podczas rejestracji", err});
    }
};

const login = async (req, res) => {
    try {
        const { mail, login, password } = req.body;
        if ((!mail && !login) || !password) {
            return res.status(400).json({ message: "Podaj mail lub login oraz hasło" });
        }

        const user = await User.findOne({
            $or: [{ mail }, { login }],
        });

        if (!user) {
            return res.status(401).json({ message: "Nieprawidłowe dane logowania" });
        }

        const passwordOk = await bcrypt.compare(password, user.hash);
        if (!passwordOk) {
            return res.status(401).json({ message: "Nieprawidłowe dane logowania" });
        }

        if (!user.isApprovedByAdmin) {
            return res.status(403).json({ message: "Konto nie zostało jeszcze zaakceptowane przez administratora" });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "100m" }
        );

        // Uwaga: w dev bez HTTPS secure: true zablokuje cookie; można ustawić warunkowo.
        res.cookie("jwt", token, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 100 * 60 * 1000,
        });

        return res.status(200).json({ message: "Zalogowano", token });
    } catch (error) {
        return res.status(500).json({ message: "Błąd podczas logowania", error: error?.message });
    }
};

module.exports = { register, login };

