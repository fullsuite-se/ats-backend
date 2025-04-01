const express = require("express");
const router = express.Router();
const multer = require('multer');
const uploadController = require('../../controllers/upload/uploadController');

const storage = multer.diskStorage({});
const upload = multer({storage});


// /upload/cv
router.post('/cv', upload.single('file') ,uploadController.uploadCV);

// /upload/gdrive/cv
router.post('/gdrive/cv', upload.single("file"), uploadController.uploadCVGdrive)

module.exports = router;