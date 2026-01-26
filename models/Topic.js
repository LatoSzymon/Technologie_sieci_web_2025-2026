const {Schema, model} = require("mongoose");

const topicSchema = new Schema({
    name: {
        type: String,
        required: true,
        default: "A topic with no name",
        unique: true
    },
    description: {
        type: String,
        default: ''
    },
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
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
    blockedUserExceptions: [{
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        allowedInTopicIds: [{
            type: Schema.Types.ObjectId,
            ref: "Topic"
        }]
    }],
    parent: {
        type: Schema.Types.ObjectId,
        ref: "Topic"
    },
    children: [{
        type: Schema.Types.ObjectId,
        ref: "Topic"
    }],
    tags: [{
        type: Schema.Types.ObjectId,
        ref: "Tag"
    }],
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