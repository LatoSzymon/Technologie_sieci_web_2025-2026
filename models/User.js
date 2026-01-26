const {Schema, model} = require("mongoose");

const userSchema = new Schema({
    login: { 
        type: String,
        required: true,
        unique: true    
    },
    mail: {
        type: String,
        required: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Podaj poprawny adres email']
    },
    hash: String,
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    OwnedTopics: Array,
    SubOwnedTopics: Array,
    isApprovedByAdmin: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    lastReadPage: {
        type: Map,
        of: Number,
        default: new Map(),
    }
}, {timestamps: true});

module.exports = model("User", userSchema);



