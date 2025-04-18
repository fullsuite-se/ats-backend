const express = require("express");
const router = express.Router();

const metricsController = require("../../controllers/analytic/metricsController");

router.get('/', metricsController.getMetrics);
router.get('/fs-applicant-count', metricsController.getFSApplicationCount);

module.exports = router;