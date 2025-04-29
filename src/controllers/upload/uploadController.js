const pool = require('../../config/db');
const cloudinary = require('cloudinary').v2;
const fs = require("fs");
const path = require("path");
const gdrive = require("../../config/gdrive"); 
const stream = require("stream");
const { log } = require('console');
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

// Upload File to Google Drive
async function uploadFileToDrive(company_id, fileBuffer, fileName) {
  const { driveService, gdrive_folder_id } = await gdrive.getDriveService(company_id);

  const fileMetadata = {
    name: fileName,
    parents: [gdrive_folder_id],
  };

  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileBuffer);

  const media = {
    mimeType: "application/octet-stream",
    body: bufferStream,
  };

  const response = await driveService.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id",
  });

  const fileId = response.data.id;

  // Make it publicly accessible
  await driveService.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  const fileData = await driveService.files.get({
    fileId: fileId,
    fields: "webViewLink",
  });

  return { fileId, fileUrl: fileData.data.webViewLink };
}

exports.uploadCVGdrive = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        //assume that it is coming from FS. So use the company_id of sullsuite.
        let company_id = COMPANY_ID; 

        if (req.body.company_id) {
            // if req.company_id is present, it comes from the ATS. 
            // So use the company_id of the user log in to the ATS.
           company_id = req.body.company_id; 
        }

        
        const { buffer, originalname } = req.file;
        const { fileId, fileUrl } = await uploadFileToDrive(company_id,buffer, originalname);
    
        res.json({ success: true, fileId, fileUrl }); // Return the file ID and sharable link
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
}