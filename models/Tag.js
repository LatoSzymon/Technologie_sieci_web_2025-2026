const {Schema, model} = require("mongoose");

const tagSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    scope: {
        type: String,
        enum: ["global", "topic"],
        default: "global"
    },
    topicRootId: {
        type: Schema.Types.ObjectId,
        ref: "Topic",
        default: null
    }
});

tagSchema.index({ scope: 1, topicRootId: 1, name: 1 }, { unique: true });

module.exports = model("Tag", tagSchema);