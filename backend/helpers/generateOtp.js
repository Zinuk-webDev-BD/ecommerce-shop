// 6 digit er otp generate korar jonno helper function
const generateOtp = () => {
  // 100000 theke 999999 er moddhe random number generate kore string e convert kora hocche
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = generateOtp;