const User = require("../models/User");
const Topic = require("../models/Topic");
const bcrypt = require("bcrypt");


const register = (req, res) => {
    try {
        const { email, username, password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            return res.status(400).json({message: "Password and Confirm password are not the same value"});
        }

    } catch (err) {
        return res.status(500).json({message: "Something went wrong while registering a new user", err});
    }
}