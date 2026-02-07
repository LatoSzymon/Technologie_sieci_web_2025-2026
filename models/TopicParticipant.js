const { Schema, model } = require("mongoose");

const topicParticipantSchema = new Schema(
  {
    topicId: {
      type: Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    lastPostAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

topicParticipantSchema.index({ topicId: 1, userId: 1 }, { unique: true });

module.exports = model("TopicParticipant", topicParticipantSchema);
