const express = require('express')
const router = express.Router();

const userConfigurationController = require("../../controllers/userConfiguration/userConfigurationController");
const gdriveConfigurationController = require("../../controllers/userConfiguration/gdriveConfigurationController");


// /user-configuration/smtp/add-credentials
router.post('/smtp/add-credentials', userConfigurationController.addSmtpCredentials);
router.get('/smtp/get-credentials/:user_id', userConfigurationController.getSmtpCredentials);

// TODO: /user-configuration/smtp/edit-credentials

// /user-configuration/gdrive/add-credentials
router.post('/gdrive/add-credentials', gdriveConfigurationController.addGdriveConfigurationCredentials);
router.get('/gdrive/get-credentials/:company_id', gdriveConfigurationController.getGdriveConfig);

module.exports = router;