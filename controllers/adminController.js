const User = require("../models/User");
const Topic = require("../models/Topic");
const Post = require("../models/Post");

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
            id,
            {isApprovedByAdmin: true},
            {new: true, select: '-hash'}
        );

        if (!user) {
            return res.status(404).json({message: "użytkownik nie istnieje"});
        }

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.to('admins').emit('admin:notify', {
                    type: 'user-approved',
                    login: user.login,
                    mail: user.mail,
                    userId: user._id,
                    message: `Użytkownik zaakceptowany: ${user.login} (${user.mail})`
                });

                io.to(`user:${user._id}`).emit('user:approved', { userId: user._id, message: 'Twoje konto zostało zaakceptowane!' });
                console.log(`Emitted user:approved to user:${user._id}`);
            }
        } catch (e) {
            console.error('WebSocket admin notify (approve) error:', e);
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

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.to(`user:${user._id}`).emit('user:blocked', { userId: user._id, message: 'Zostałeś zablokowany przez administratora' });
                io.to('admins').emit('admin:notify', {
                    type: 'user-blocked',
                    login: user.login,
                    mail: user.mail,
                    userId: user._id,
                    message: `Użytkownik zablokowany: ${user.login} (${user.mail})`
                });
                io.to('admins').emit('admin:users-updated', { type: 'blocked', user });
                console.log(`Emitted user:blocked to user:${user._id}`);
            }
        } catch (e) {
            console.error('WebSocket error (blockUser):', e);
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

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.to(`user:${user._id}`).emit('user:unblocked', { userId: user._id, message: 'Blokada została usunięta' });
                io.to('admins').emit('admin:notify', {
                    type: 'user-unblocked',
                    login: user.login,
                    mail: user.mail,
                    userId: user._id,
                    message: `Użytkownik odblokowany: ${user.login} (${user.mail})`
                });
                io.to('admins').emit('admin:users-updated', { type: 'unblocked', user });
                console.log(`Emitted user:unblocked to user:${user._id}`);
            }
        } catch (e) {
            console.error('WebSocket error (unblockUser):', e);
        }

        return res.status(200).json({message: "Odblokowano użytkownika"});
    } catch (error) {
        return res.status(500).json({message: "Błąd przy odblokowywaniu użytkownika", error});
    }
};

const listBlockedUsers = async (req, res) => {
    try {
        const users = await User.find({isBlocked: true}).select('-hash');
        return res.status(200).json({users});
    } catch (er) {
        return res.status(500).json({message: "Błąd przy wylistowywaniu zablokowanych użytkowników", er});
    }
};

const listAllNonAdminUsers = async (req, res) => {
    try {
        const users = await User.find({role: {$ne: 'admin'}}).select('-hash').sort({login: 1});
        return res.status(200).json({users});
    } catch (er) {
        return res.status(500).json({message: "Błąd przy wylistowywaniu użytkowników", er});
    }
};

const deleteUser = async (req, res) => {
    try {
        const {userId} = req.body;

        if (!userId) {
            return res.status(400).json({message: "Nie podano ID użytkownika"});
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({message: "Użytkownik nie znaleziony"});
        }

        if (user.role === 'admin') {
            return res.status(403).json({message: "Nie można usunąć administratora"});
        }

        await User.findByIdAndDelete(userId);

        try {
            const io = req.app.get && req.app.get('io');
            if (io) {
                io.to('admins').emit('admin:notify', {
                    type: 'user-deleted',
                    login: user.login,
                    userId: user._id,
                    message: `Użytkownik usunięty: ${user.login}`
                });
            }
        } catch (e) {
            console.error('WebSocket error (deleteUser):', e);
        }

        return res.status(200).json({message: "Użytkownik usunięty"});
    } catch (err) {
        return res.status(500).json({message: "Błąd usuwania użytkownika", err});
    }
};


module.exports = {listRegisteredButNotAcceptedUsers, blockUser, unblockUser, approveUser, listBlockedUsers, listAllNonAdminUsers, closeTopic, openTopic, hideTopic, unhideTopic, deleteUser};