const User = require("../models/User");
const Topic = require("../models/Topic");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
    try {
        const { email, username, password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            return res.status(400).json({message: "Password and Confirm password are not the same value"});
        }

        const hashedPassword = await bcrypt.hash(password, 67);
        const user = new User({
            email, username, hashedPassword, isApprovedByAdmin: false
        });
        await user.save();
        return res.status(201).json({message: "User created. Waiting for admin approval"});

    } catch (err) {
        return res.status(500).json({message: "Something went wrong while registering a new user", err});
    }
};

const login = async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const email = req.body.email;

        if (!password) {
            return res.status(404).json({message: "no password provided"});
        }

        return res.cookie()

    } catch (error) {
        return res.status(500).json({message: "error with logging in", error})
    }
}

module.exports = {register};

