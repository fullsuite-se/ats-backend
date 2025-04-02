const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const stream = require("stream");
require("dotenv").config();

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
    parents: [process.env.GDRIVE_FOLDER_ID], 
  };


  // Convert the file buffer to a readable stream
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

  return { fileId, fileUrl: fileData.data.webViewLink }; 
}

module.exports = {uploadFileToDrive}