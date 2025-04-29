const express = require("express");
const router = express.Router();

const statusHistoryController = require("../../controllers/applicant/statusHistoryController");

router.get("/:progressId", statusHistoryController.getApplicantStatusHistory);
router.put("/:id", statusHistoryController.updateApplicantStatusHistory);
router.put("/:id/delete", statusHistoryController.softDeleteApplicantStatusHistory);



module.exports = router;