require("dotenv").config();
const mongoose = require("mongoose");
const Topic = require("../models/Topic");
const User = require("../models/User");

const dbConnData = {
  host: process.env.MONGO_HOST || "mongodb",
  port: process.env.MONGO_PORT || 27017,
  database: process.env.MONGO_DATABASE || "ProgTalk"
};

const connectDb = async () => {
  const uri = `mongodb://${dbConnData.host}:${dbConnData.port}/${dbConnData.database}`;
  await mongoose.connect(uri);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = { count: 50, prefix: "temat", parentId: null };
  for (const arg of args) {
    if (arg.startsWith("--count=")) {
      out.count = Number(arg.split("=")[1]) || out.count;
    } else if (arg.startsWith("--prefix=")) {
      out.prefix = arg.split("=")[1] || out.prefix;
    } else if (arg.startsWith("--parent=")) {
      out.parentId = arg.split("=")[1] || null;
    }
  }
  return out;
};

const getOwner = async () => {
  const admin = await User.findOne({ role: "admin" });
  if (admin) return admin;
  return User.findOne({});
};

const main = async () => {
  const { count, prefix, parentId } = parseArgs();
  if (!Number.isFinite(count) || count < 1) {
    console.error("Invalid --count value");
    process.exitCode = 1;
    return;
  }

  try {
    await connectDb();

    const owner = await getOwner();
    if (!owner) {
      throw new Error("No users found. Create a user first.");
    }

    let parent = null;
    if (parentId) {
      parent = await Topic.findById(parentId);
      if (!parent) {
        throw new Error("Parent topic not found for --parent");
      }
    }

    const docs = [];
    const now = Date.now();
    for (let i = 1; i <= count; i += 1) {
      docs.push({
        name: `${prefix}${i}`,
        description: `Auto topic ${now}-${i}`,
        ownerId: owner._id,
        moderatorsId: [],
        bannedUsersIds: [],
        parent: parent ? parent._id : null,
        tags: []
      });
    }

    const created = await Topic.insertMany(docs);

    if (parent) {
      parent.children.push(...created.map(t => t._id));
      await parent.save();
    }

    console.log(`Inserted ${created.length} topics.`);
  } catch (error) {
    console.error("Add topics error:", error.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

main();
