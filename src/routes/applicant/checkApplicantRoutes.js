const express = require("express")
require("dotenv").config()
const router = express.Router();

const checkApplicantController = require("../../controllers/applicant/checkApplicantController");

//applicants/check/check-if-blacklisted
router.post("/check-if-blacklisted", checkApplicantController.checkIfBlacklisted); 

// /applicants/check/check-existing
router.post("/check-existing", checkApplicantController.checkExistingApplication); 

module.exports = router; 