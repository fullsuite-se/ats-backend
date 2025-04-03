const express = require("express");
const router = express.Router();

const pendingApplicantController = require("../../controllers/applicant/pendingApplicantController")

router.get("/", pendingApplicantController.getPendingApplicant);
router.post("/", pendingApplicantController.addApplicantToPending); 
router.post("/confirm", pendingApplicantController.confirmPendingApplicant);
router.post("/reject", pendingApplicantController.rejectPendingApplicant);

module.exports = router;