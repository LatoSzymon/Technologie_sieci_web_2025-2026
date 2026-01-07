const {Schema, model} = require("mongoose");

const topicSchema = new Schema({
    name: {
        type: String,
        required: true,
        default: "A topic with no name",
        unique: true
    },
    ownerId: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    ],
    moderatorsId: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
        }
    ],
    bannedUsersIds: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    parent: {
        type: Schema.Types.ObjectId,
        ref: "Topic"
    },
    isClosed: {
        type: Boolean,
        default: false
    },
    isHidden: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = model("Topic", topicSchema);