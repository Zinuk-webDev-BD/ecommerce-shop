const nodemailer = require("nodemailer");

// Gmail er sahajje email pathanor jonno transporter create kora hocche
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// sendEmail function ta email pathanor jonno use kora hocche, jekhane to, subject and html content pass kora hocche
const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"Auth System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;