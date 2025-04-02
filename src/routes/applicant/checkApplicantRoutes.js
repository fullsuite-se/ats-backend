const express = require("express")
require("dotenv").config()
const router = express.Router();

const checkApplicantController = require("../../controllers/applicant/checkApplicantController");

//applicants/check/check-if-blacklisted
router.post("/check-if-blacklisted", checkApplicantController.checkIfBlacklisted); 

module.exports = router; 