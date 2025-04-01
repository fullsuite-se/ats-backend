const express = require('express') 
const router = express.Router(); 

const userConfigurationController = require("../../controllers/userConfiguration/userConfigurationController");

router.post('/smtp/add-credentials', userConfigurationController.addSmtpCredentials); 

module.exports = router;