const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/analytic/dashboardController');

// Dashboard summary metrics
router.get('/summary', dashboardController.getDashboardSummary);

// Applicant status distribution
router.get('/status-distribution', dashboardController.getApplicantStatusDistribution);

// Applicant source distribution
router.get('/source-distribution', dashboardController.getApplicantSourceDistribution);

// Application source distribution
router.get('/application-source', dashboardController.getApplicationSourceDistribution);

// Job position analytics
router.get('/job-positions', dashboardController.getJobPositionAnalytics);

// Monthly applicant trends
router.get('/monthly-trends', dashboardController.getMonthlyApplicantTrends);

// Recent applicants
router.get('/recent-applicants', dashboardController.getRecentApplicants);

// Interview schedule analytics
router.get('/interview-schedule', dashboardController.getInterviewScheduleAnalytics);

// Hiring funnel metrics
router.get('/hiring-funnel', dashboardController.getHiringFunnelMetrics);

// Time to hire metrics
router.get('/time-to-hire', dashboardController.getTimeToHireMetrics);

module.exports = router;