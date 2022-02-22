const nodemailer = require("nodemailer");
require("dotenv").config();

const { UKRNET_PASSWORD } = process.env;

const nodemailerConfig = {
  host: "smtp.ukr.net",
  port: 465,
  secure: true,
  auth: {
    user: "svanstep@ukr.net",
    pass: UKRNET_PASSWORD,
  },
};

const transporter = nodemailer.createTransport(nodemailerConfig);

const sendMail = async (data) => {
  try {
    const mail = { ...data, from: "svanstep@ukr.net" };
    await transporter.sendMail(mail);
    return true;
  } catch (error) {
    throw console.log(error);
  }
};

module.exports = sendMail;
