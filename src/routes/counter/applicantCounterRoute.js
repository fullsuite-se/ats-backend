const express = require('express')
const router = express.Router();
const applicantCounterController = require('../../controllers/counter/applicantCounterController')

//counts all 
router.get("/", applicantCounterController.getApplicantCount)

//counts first time job seekers
router.get("/first-time-jobseekers", applicantCounterController.getFirstTimeJobSeekerCount)

router.post("/try", applicantCounterController.tryAPI)

module.exports = router;