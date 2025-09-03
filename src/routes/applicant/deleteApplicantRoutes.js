const express = require("express");
const router = express.Router();
const applicantController = require("../../controllers/applicant/applicantController");

// DELETE applicant by ID
router.delete("/:applicant_id", applicantController.deleteApplicant);

module.exports = router;
