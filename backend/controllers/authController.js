const bcrypt = require("bcrypt");
const User = require("../models/User");
const { redisClient } = require("../configuration/redisConfig");
const generateOtp = require("../helpers/generateOtp");
const sendEmail = require("../helpers/sendEmail");
const generateToken = require("../helpers/generateToken");

// how long an otp stays in redis (5 minutes = 300 seconds)
const OTP_EXPIRE_SECONDS = 300;

// register a new user and send a verification otp
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "password must be at least 6 characters" });
    }

    // check if an account with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // create otp and keep it in redis for 5 minutes (EX = expire in seconds)
    const otp = generateOtp();
    await redisClient.set(`otp:${user.email}`, otp, { EX: OTP_EXPIRE_SECONDS });

    // send the otp to the user's email
    await sendEmail(
      user.email,
      "Verify your email",
      `<h2>Hello ${user.name}</h2>
       <p>Your verification code is:</p>
       <h1>${otp}</h1>
       <p>This code will expire in 5 minutes.</p>`
    );

    res.status(201).json({
      message: "registered successfully, OTP sent to your email",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// check the otp and verify the user's email
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "email and otp are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "email is already verified" });
    }

    // get the otp from redis (null means it expired after 5 minutes)
    const savedOtp = await redisClient.get(`otp:${user.email}`);
    if (!savedOtp) {
      return res.status(400).json({ message: "otp expired or not found" });
    }

    if (savedOtp !== otp.toString()) {
      return res.status(400).json({ message: "invalid otp" });
    }

    // otp is correct: mark user as verified and remove the otp from redis
    user.isVerified = true;
    await user.save();
    await redisClient.del(`otp:${user.email}`);

    res.status(200).json({ message: "email verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// login with email and password
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "invalid email or password" });
    }

    // google/github users have no password, so stop them here
    if (!user.password) {
      return res.status(400).json({ message: "this account uses social login" });
    }

    // check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "invalid email or password" });
    }

    // do not allow login before the email is verified
    if (!user.isVerified) {
      return res.status(403).json({ message: "please verify your email first" });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: "login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// forgot password: send a reset otp to the user's email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    const user = await User.findOne({ email });

    // same message for every case, so nobody can guess which emails are registered
    const safeMessage = "if this email is registered, a reset otp has been sent";

    if (!user) {
      return res.status(200).json({ message: safeMessage });
    }

    // create otp and keep it in redis for 5 minutes
    const otp = generateOtp();
    await redisClient.set(`reset:${user.email}`, otp, { EX: OTP_EXPIRE_SECONDS });

    // send the otp to the user's email
    await sendEmail(
      user.email,
      "Reset your password",
      `<h2>Hello ${user.name}</h2>
       <p>Your password reset code is:</p>
       <h1>${otp}</h1>
       <p>This code will expire in 5 minutes.</p>`
    );

    res.status(200).json({ message: safeMessage });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// reset password: check the otp and save the new password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ message: "email, otp and newPassword are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "invalid otp" });
    }

    // get the otp from redis (null means it expired or was never sent)
    const savedOtp = await redisClient.get(`reset:${user.email}`);
    if (!savedOtp) {
      return res.status(400).json({ message: "otp expired or not found" });
    }

    if (savedOtp !== otp.toString()) {
      return res.status(400).json({ message: "invalid otp" });
    }

    // hash the new password and save it
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // otp is used once, so remove it from redis
    await redisClient.del(`reset:${user.email}`);

    res.status(200).json({ message: "password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// change password: logged in user changes password using the old one
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "oldPassword and newPassword are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "password must be at least 6 characters" });
    }

    // req.user has no password (middleware removed it), so load the user again with password
    const user = await User.findById(req.user._id);

    // google/github users have no password to change
    if (!user.password) {
      return res.status(400).json({ message: "this account uses social login" });
    }

    // check the old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "old password is incorrect" });
    }

    // do not allow the same password again
    if (oldPassword === newPassword) {
      return res
        .status(400)
        .json({ message: "new password must be different from old password" });
    }

    // hash the new password and save it
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// get the logged in user's profile (middleware already put the user in req.user)
const getMe = async (req, res) => {
  res.status(200).json({ user: req.user });
};

module.exports = {
  register,
  verifyOtp,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
};