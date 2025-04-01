const express = require("express");
const router = express.Router();

const statusHistoryController = require("../../controllers/applicant/statusHistoryController");

router.get("/:progressId", statusHistoryController.getApplicantStatusHistory);

module.exports = router;