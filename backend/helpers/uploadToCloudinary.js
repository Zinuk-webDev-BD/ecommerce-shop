const cloudinary = require("../configuration/cloudinaryConfig");

// upload one image buffer to a cloudinary folder
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
};

module.exports = uploadToCloudinary;