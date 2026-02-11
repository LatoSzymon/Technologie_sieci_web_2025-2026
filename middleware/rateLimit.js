const rateLimit = require("express-rate-limit");

const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message }
  });

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Za duzo prob, sprobuj ponownie za chwile"
});

const writeLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: "Za duzo operacji zapisu, sprobuj pozniej"
});

const adminLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Za duzo zapytan administracyjnych, sprobuj pozniej"
});

module.exports = {
  authLimiter,
  writeLimiter,
  adminLimiter
};
