const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const stream = require("stream");
require("dotenv").config();
const gdriveModel = require("../models/userConfiguration/gdriveModel");


const getDriveService = async (company_id) => {
  let config_json, gdrive_folder_id;

  try {
    // Attempt to retrieve company-specific config
    const config = await gdriveModel.getGdriveConfig(company_id);
    config_json = config.config_json;
    gdrive_folder_id = config.gdrive_folder_id;
  } catch (err) {
    console.warn('Failed to get config from DB:', err.message);
  }

  // Fallback to env credentials if no config found or invalid
  const credentials = config_json || {
    type: process.env.TYPE,
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY,
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: process.env.AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
    universe_domain: process.env.UNIVERSE_DOMAIN,
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  const driveService = google.drive({ version: "v3", auth });
  return { driveService, gdrive_folder_id };
};

// Upload File to Google Drive
async function uploadFileToDrive(company_id, fileBuffer, fileName) {
  const { driveService, gdrive_folder_id } = await getDriveService(company_id);

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

module.exports = { uploadFileToDrive }