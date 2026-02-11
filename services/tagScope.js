const Topic = require("../models/Topic");
const Tag = require("../models/Tag");

const getRootTopicId = async (topicId) => {
  if (!topicId) {
    return null;
  }
  let current = await Topic.findById(topicId).select("parent");
  if (!current) {
    return null;
  }
  while (current.parent) {
    current = await Topic.findById(current.parent).select("parent");
    if (!current) {
      return null;
    }
  }
  return current._id;
};

const isUserModeratorForRoot = async (userId, rootTopicId) => {
  if (!userId || !rootTopicId) {
    return false;
  }
  const root = await Topic.findById(rootTopicId).select("ownerId moderatorsId");
  if (!root) {
    return false;
  }
  if (root.ownerId?.equals(userId)) {
    return true;
  }
  return (root.moderatorsId || []).some((id) => id.equals(userId));
};

const getAllowedTagsForTopic = async (topicId) => {
  if (!topicId) {
    return Tag.find({ scope: "global" });
  }
  const rootId = await getRootTopicId(topicId);
  if (!rootId) {
    return Tag.find({ scope: "global" });
  }
  return Tag.find({
    $or: [
      { scope: "global" },
      { scope: "topic", topicRootId: rootId }
    ]
  });
};

module.exports = {
  getRootTopicId,
  isUserModeratorForRoot,
  getAllowedTagsForTopic
};
