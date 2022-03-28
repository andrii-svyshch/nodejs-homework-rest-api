const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const Jimp = require("jimp");
const createError = require("http-errors");
const Joi = require("joi");

const { User, schemas } = require("../../models/user");
const { authenticate, upload } = require("../../middlewares");
const { sendMail } = require("../../helpers");

const router = express.Router();

router.get("/verify/:verificationToken", async (req, res, next) => {
  try {
    const { verificationToken } = req.params;
    const user = await User.findOne({ verificationToken });
    if (!user) {
      throw createError(404, "User not found");
    }
    await User.findByIdAndUpdate(user._id, {
      verify: true,
      verificationToken: "",
    });
    res.json({ message: "Verification successful" });
  } catch (error) {
    next(error);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    const { error } = schemas.verify.validate(req.body);
    if (error) {
      throw createError(400, "missing required field email");
    }
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user.verify) {
      throw createError(400, "Verification has already been passed");
    }
    const mail = {
      to: email,
      subject: "Email confirmation",
      html: `<a target="_blank" href='http://localhost:3000/api/users/verify/${user.verificationToken}'>Confirm email</a>`,
    };
    await sendMail(mail);
    res.json({ message: "Verification email sent" });
  } catch (error) {
    console.log(error);
  }
});

router.get("/current", authenticate, async (req, res, next) => {
  res.json({
    email: req.user.email,
    subscription: req.user.subscription,
  });
});

router.get("/logout", authenticate, async (req, res, next) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: null });
  res.status(204).send();
});

const avatarsDir = path.join(__dirname, "../../", "public", "avatars");

router.patch(
  "/avatars",
  authenticate,
  upload.single("avatar"),
  async (req, res, next) => {
    const { _id } = req.user;
    const { path: tempUpload, filename } = req.file;
    try {
      await Jimp.read(tempUpload)
        .then((avatar) => avatar.resize(250, 250).write(tempUpload))
        .catch((err) => {
          console.error(err);
        });
      const [extention] = filename.split(".").reverse();
      const newFileName = `${_id}.${extention}`;
      const resultUpload = path.join(avatarsDir, newFileName);
      await fs.rename(tempUpload, resultUpload);
      const avatarURL = path.join(
        `${req.protocol}://${req.headers.host}`,
        "public",
        "avatars",
        newFileName
      );
      await User.findByIdAndUpdate(_id, { avatarURL });
      res.json({ avatarURL });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
