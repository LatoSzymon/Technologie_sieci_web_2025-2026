require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Topic = require("../models/Topic");
const Tag = require("../models/Tag");

const dbConnData = {
  host: process.env.MONGO_HOST || "mongodb",
  port: process.env.MONGO_PORT || 27017,
  database: process.env.MONGO_DATABASE || "ProgTalk"
};

const connectDb = async () => {
  const uri = `mongodb://${dbConnData.host}:${dbConnData.port}/${dbConnData.database}`;
  await mongoose.connect(uri);
};

const seedIfEmpty = async () => {
  const usersCount = await User.countDocuments();
  if (usersCount > 0 && process.env.SEED_FORCE !== "true") {
    console.log("Seed: baza nie jest pusta, pomijam wstrzykiwanie danych.");
    return;
  }

  if (usersCount > 0) {
    await Promise.all([
      User.deleteMany({}),
      Topic.deleteMany({}),
      Tag.deleteMany({})
    ]);
  }

  const adminSpecs = [
    { login: "admin1", mail: "admin1@progtalk.com", password: "Admin123!" },
    { login: "admin2", mail: "admin2@progtalk.com", password: "Admin123!" }
  ];

  const userSpecs = [
    { login: "user1", mail: "user1@progtalk.com", password: "User123!" },
    { login: "user2", mail: "user2@progtalk.com", password: "User123!" },
    { login: "user3", mail: "user3@progtalk.com", password: "User123!" }
  ];

  const hashPassword = async (plain) => bcrypt.hash(plain, 12);

  const admins = [];
  for (const spec of adminSpecs) {
    admins.push({
      login: spec.login,
      mail: spec.mail,
      hash: await hashPassword(spec.password),
      role: "admin",
      isApprovedByAdmin: true,
      isBlocked: false
    });
  }

  const users = [];
  for (const spec of userSpecs) {
    users.push({
      login: spec.login,
      mail: spec.mail,
      hash: await hashPassword(spec.password),
      role: "user",
      isApprovedByAdmin: true,
      isBlocked: false
    });
  }

  const createdAdmins = await User.insertMany(admins);
  const createdUsers = await User.insertMany(users);

  const admin1 = createdAdmins.find((u) => u.login === "admin1");
  const admin2 = createdAdmins.find((u) => u.login === "admin2");
  const user1 = createdUsers.find((u) => u.login === "user1");

  const tagJS = await Tag.create({ name: "JavaScript" });
  const tagNode = await Tag.create({ name: "Node.js" });
  const tagMongo = await Tag.create({ name: "MongoDB" });
  const tagDocker = await Tag.create({ name: "Docker" });

  const rootProgramming = await Topic.create({
    name: "Programowanie",
    description: "Dyskusje o programowaniu",
    ownerId: admin1._id,
    moderatorsId: [admin2._id],
    tags: [tagJS._id, tagNode._id, tagMongo._id]
  });

  const rootDevOps = await Topic.create({
    name: "DevOps",
    description: "Automatyzacja, CI/CD, infrastruktura",
    ownerId: admin2._id,
    moderatorsId: [admin1._id],
    tags: [tagDocker._id]
  });

  const topicNode = await Topic.create({
    name: "Node.js",
    description: "Backend w JavaScript",
    ownerId: admin1._id,
    moderatorsId: [user1._id],
    parent: rootProgramming._id,
    tags: [tagNode._id]
  });

  const topicMongo = await Topic.create({
    name: "MongoDB",
    description: "Dokumentowe bazy danych",
    ownerId: admin1._id,
    moderatorsId: [],
    parent: rootProgramming._id,
    tags: [tagMongo._id]
  });

  const topicDocker = await Topic.create({
    name: "Docker",
    description: "Konteneryzacja i obrazy",
    ownerId: admin2._id,
    moderatorsId: [],
    parent: rootDevOps._id,
    tags: [tagDocker._id]
  });

  rootProgramming.children.push(topicNode._id, topicMongo._id);
  rootDevOps.children.push(topicDocker._id);

  await rootProgramming.save();
  await rootDevOps.save();

  console.log("Seed: dodano administratorow, uzytkownikow i tematy.");
};

const main = async () => {
  try {
    await connectDb();
    await seedIfEmpty();
  } catch (error) {
    console.error("Seed error:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

main();
