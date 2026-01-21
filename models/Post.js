const {Schema, model} = require("mongoose");

const PostSchema = new Schema({
    topicId: {
        type: Schema.Types.ObjectId,
        ref: "Topic",
        required: true
    },

})


// temat
// tresc
//idAutora
// likes
// dislikes
//jakis znacznik wykasowania/zablokowania
