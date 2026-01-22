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
    tags: [{
        type: Schema.Types.ObjectId,
        ref: "Tag"
    }],
    likes: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    dislikes: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    isDeleted: {
        type: Boolean,
        default: false
    }


}, {timestamps: true});


//na przyszłość, zrób mechanizm odpowiadania innym na posty

module.exports = model("Post", postSchema);
