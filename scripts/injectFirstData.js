const mongoose = require('mongoose');
const User = require('../models/User');
const Topic = require('../models/Topic');
const Post = require('../models/Post');
const Tag = require('../models/Tag');


async function main() {
  const host = process.env.MONGO_HOST || 'mongodb';
  const port = process.env.MONGO_PORT || 27017;
  const database = process.env.MONGO_DATABASE || 'ProgTalk';
  await mongoose.connect(`mongodb://${host}:${port}/${database}`);

  await Promise.all([
    User.deleteMany({}),
    Topic.deleteMany({}),
    Post.deleteMany({}),
    Tag.deleteMany({})
  ]);

  const admin = await User.create({ login: 'admin', mail: 'admin@progtalk.com', hash: 'adminhash', role: 'admin', isApprovedByAdmin: true });
  const user1 = await User.create({ login: 'user1', mail: 'user1@progtalk.com', hash: 'user1hash', isApprovedByAdmin: true });
  const user2 = await User.create({ login: 'user2', mail: 'user2@progtalk.com', hash: 'user2hash', isApprovedByAdmin: false });

  const tagJS = await Tag.create({ name: 'JavaScript' });
  const tagNode = await Tag.create({ name: 'Node.js' });

  const topicRoot = await Topic.create({
    name: 'Programowanie',
    description: 'Wszystko o programowaniu',
    ownerId: [admin._id],
    moderatorsId: [admin._id],
    tags: [tagJS._id, tagNode._id]
  });

  const topicChild = await Topic.create({
    name: 'Node.js',
    description: 'Dyskusje o Node.js',
    ownerId: [admin._id],
    moderatorsId: [user1._id],
    parent: topicRoot._id,
    tags: [tagNode._id]
  });

  topicRoot.children.push(topicChild._id);
  await topicRoot.save();

  await Post.create({
    topicId: topicRoot._id,
    content: 'Czym jest programowanie?',
    authorId: user1._id,
    tags: [tagJS._id],
    likes: [user2._id]
  });

  await Post.create({
    topicId: topicChild._id,
    content: 'Node.js to środowisko uruchomieniowe dla JavaScript!',
    authorId: user2._id,
    tags: [tagNode._id],
    likes: [user1._id, admin._id]
  });

  console.log('Przykładowe dane zostały wstrzyknięte!');
  process.exit();
}

main();