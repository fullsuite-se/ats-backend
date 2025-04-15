const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
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

module.exports = { getDriveService }