require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const User = require('../models/User');

const dbConnData = {
    host: process.env.MONGO_HOST || 'mongodb',
    port: process.env.MONGO_PORT || 27017,
    database: process.env.MONGO_DATABASE || 'ProgTalk'
}

const plantAnAdmin = async () => {
    try {
        await mongoose.connect(`mongodb://${dbConnData.host}:${dbConnData.port}/${dbConnData.database}`);
        const adminExists = await User.findOne({role: 'admin'});

        if (adminExists) {
            console.log("Jakiś admin już istnieje");
            process.exit(1);
        }

        const hash = await bcrypt.hash('adminnimda', 12);
        const admin = new User({
            mail: "admin@first2.pl",
            login: 'adminek',
            hash,
            role: 'admin',
            isApprovedByAdmin: true,
            isBlocked: false
        });

        await admin.save();
        console.log("Admin dodany", admin);
        process.exit(0);
    } catch (error) {
        throw new Error("Coś poszło nie tak przy dodawaniu admina");
        process.exit(1)
    }
}

plantAnAdmin();