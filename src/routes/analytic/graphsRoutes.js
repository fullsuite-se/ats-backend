const express = require("express");
const router = express.Router();

const graphsController = require("../../controllers/analytic/graphsController");

// /analytic/graphs/source
router.get('/source', graphsController.source);

// /analytic/graphs/requisition
router.get('/requisition', graphsController.requisition);

// /analytic/graphs/application-trend
router.get('/application-trend', graphsController.applicationTrend);

// /analytic/graphs/top-applied-jobs

router.get('/top-applied-jobs', graphsController.topAppliedJobs);

// /analytic/graphs/applicant-sources
router.get('/applicant-sources', graphsController.applicantSources);

// /analytic/graphs/drop-off-rate
router.get('/drop-off-rate', graphsController.dropoffRate);


module.exports = router;

