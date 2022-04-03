const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
require('dotenv').config();

const storage = new GridFsStorage({
    url: `mongodb+srv://speed_dealer:${process.env.DB_PASSWORD}@newsplanedb.ee7ac.mongodb.net/NewsplaneDB?retryWrites=true&w=majority`,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
          const filename = `${Date.now()}-newsplane-${file.originalname}`;
          const fileInfo = {
            filename: filename,
            bucketName: 'images'
          };
          resolve(fileInfo);
      });
    }
});

module.exports = multer({storage});