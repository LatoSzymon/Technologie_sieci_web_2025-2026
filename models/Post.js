const {Schema, model} = require("mongoose");

const postSchema = new Schema({
    topicId: {
        type: Schema.Types.ObjectId,
        ref: "Topic",
        required: true
    },
    content: {
        type: String,
        required: true,
    },
    authorId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    likes: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    replyTo: {
        type: Schema.Types.ObjectId,
        ref: "Post",
        default: null
    },
    tags: [{
        type: Schema.Types.ObjectId,
        ref: "Tag"
    }],
    isDeleted: {
        type: Boolean,
        default: false
    }


}, {timestamps: true});


module.exports = model("Post", postSchema);
