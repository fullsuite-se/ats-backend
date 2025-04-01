const pool = require('../../config/db');
const cloudinary = require('cloudinary').v2;
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const stream = require("stream");
require("dotenv").config();

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

// Load Google Service Account Key
const credentials = {
    "type": process.env.TYPE,
    "project_id": process.env.PROJECT_ID,
    "private_key_id": process.env.PRIVATE_KEY_ID,
    "private_key": process.env.PRIVATE_KEY,
    "client_email": process.env.CLIENT_EMAIL,
    "client_id": process.env.CLIENT_ID,
    "auth_uri": process.env.AUTH_URI,
    "token_uri": process.env.TOKEN_URI,
    "auth_provider_x509_cert_url": process.env.AUTH_PROVIDER_X509_CERT_URL,
    "client_x509_cert_url": process.env.CLIENT_X509_CERT_URL,
    "universe_domain": process.env.UNIVERSE_DOMAIN,
}; 
const auth = new google.auth.GoogleAuth({
  credentials: credentials,  // Use credentials object instead of keyFile
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const driveService = google.drive({ version: "v3", auth });

// Upload File to Google Drive
async function uploadFileToDrive(fileBuffer, fileName) {
  const fileMetadata = {
    name: fileName,
    parents: ["1Z_F23GPD8aDcM37JElP2xAUKiad0MJ3V"], // correct - array of parent folder IDs
  };

  // Convert the file buffer to a readable stream
  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileBuffer);

  const media = {
    mimeType: "application/octet-stream",
    body: bufferStream,  // Now passing the stream instead of the buffer
  };

  const response = await driveService.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id",
  });

  const fileId = response.data.id;

  // Make the file publicly accessible
  await driveService.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  // Get the shareable link (webViewLink) instead of the direct download URL
  const fileData = await driveService.files.get({
    fileId: fileId,
    fields: "webViewLink",
  });

  return { fileId, fileUrl: fileData.data.webViewLink }; // Return the sharable link
}


exports.uploadCVGdrive = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { buffer, originalname } = req.file;
        const { fileId, fileUrl } = await uploadFileToDrive(buffer, originalname);
    
        res.json({ success: true, fileId, fileUrl }); // Return the file ID and sharable link
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
}