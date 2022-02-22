const express = require("express");
const createError = require("http-errors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const { v4 } = require("uuid");

const { User, schemas } = require("../../models/user");
const { sendMail } = require("../../helpers");

const router = express.Router();

const { SECRET_KEY } = process.env;

router.post("/signup", async (req, res, next) => {
  try {
    const { error } = schemas.signup.validate(req.body);
    if (error) {
      throw createError(400, error.message);
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      throw createError(409, "Email in use");
    }
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    const avatarURL = gravatar.url(email, { protocol: "http" });
    const verificationToken = v4();
    await User.create({
      email,
      password: hashPassword,
      verificationToken,
      avatarURL,
    });
    const mail = {
      to: email,
      subject: "Email confirmation",
      html: `<a target="_blank" href='http://localhost:3000/api/users/verify/${verificationToken}'>Confirm email</a>`,
    };
    await sendMail(mail);
    res.status(201).json({ user: { email, subscription: "starter" } });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { error } = schemas.signup.validate(req.body);
    if (error) {
      throw createError(400, error.message);
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw createError(401, "Email or password is wrong");
    }
    if (!user.verife) {
      throw createError(401, "Email not verify");
    }
    const compareResult = await bcrypt.compare(password, user.password);
    if (!compareResult) {
      throw createError(401, "Email or password is wrong");
    }
    const payload = { id: user._id };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });
    await User.findByIdAndUpdate(user._id, { token });
    res.json({ token, user: { email, subscription: "starter" } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
