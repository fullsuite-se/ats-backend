const express = require("express");
const router = express.Router();

const metricsController = require("../../controllers/analytic/metricsController");

router.get('/applicant-received', metricsController.applicantReceived);
router.get('/top-job-applied', metricsController.topJobApplied);
router.get('/internal-external-hires', metricsController.internalExternalHires);
router.get('/candidate-drop-off-rate', metricsController.candidateDropOffRate);
router.get('/reason-for-blacklisted', metricsController.reasonForBlacklisted);
router.get('/reason-for-rejection', metricsController.reasonForRejection);

router.get('/fs-applicant-count', metricsController.getFSApplicationCount);


module.exports = router;