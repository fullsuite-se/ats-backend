const pool = require('../../config/db');
const cloudinary = require('cloudinary').v2;
const fs = require("fs");
const path = require("path");
const gdrive = require("../../config/gdrive"); 
require("dotenv").config();

const COMPANY_ID = process.env.COMPANY_ID; 

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// /upload/cv
exports.uploadCV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const folderName = "/ats/applicants-cv";
        const originalFilename = path.parse(req.file.originalname).name;
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: 'raw', 
            folder: folderName,
            public_id: originalFilename, 
            format: 'pdf',
        });

        fs.unlinkSync(req.file.path);

        res.status(200).json({ message: 'successfully uploaded file', fileUrl: result.secure_url });
    } catch (error) {
        res.status(500).json({ error: 'Upload failed', details: error.message });
    }
}

exports.uploadCVGdrive = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { buffer, originalname } = req.file;
        const { fileId, fileUrl } = await gdrive.uploadFileToDrive(COMPANY_ID,buffer, originalname);
    
        res.json({ success: true, fileId, fileUrl }); // Return the file ID and sharable link
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
}