const User = require("../models/User");

const listRegisteredButNotAcceptedUsers = async (req, res) => {
    try {
        const users = await User.find({isApprovedByAdmin: false}).select('-hash');
        return res.status(200).json({users});
    } catch (er) {
        return res.status(500).json({message: "Błąd przy wylistowywaniu niezaakceptowanych użytkowników", er});
    }
};

const approveUser = async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findByIdAndUpdate(
            {id},
            {isApprovedByAdmin: true},
            {new: true, select: '-hash'}
        );

        if (!user) {
            return res.status(404).json({message: "użytkownik nie istnieje"});
        }

        return res.status(200).json({message: "Użytkownik został zaakceptowany"});
    } catch (er) {
        return res.status(500).json({message: "Błąd przy akceptowaniu rejestracji", er});
    }
};

const blockUser = async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findByIdAndUpdate( id, {isBlocked: true}, {new: true, select: '-hash'});
        if (!user) {
            return res.status(404).json({message: "Użytkownik nie został znaleziony"});
        }

        return res.status(200).json({message: "Zablokowano użytkownika"});
    } catch (error) {
        return res.status(500).json({message: "Błąd przy blokowaniu użytkownika", error});
    }
};

const unblockUser = async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findByIdAndUpdate( id, {isBlocked: false}, {new: true, select: '-hash'});
        if (!user) {
            return res.status(404).json({message: "Użytkownik nie został znaleziony"});
        }

        return res.status(200).json({message: "Odblokowano użytkownika"});
    } catch (error) {
        return res.status(500).json({message: "Błąd przy odblokowywaniu użytkownika", error});
    }
};

module.exports = {listRegisteredButNotAcceptedUsers, blockUser, unblockUser, approveUser};