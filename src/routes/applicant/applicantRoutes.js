const express = require("express");
const router = express.Router();
const applicantController = require("../../controllers/applicant/applicantController")

//search for a list of applicants that matches search query and corresponding
//status, and position
router.get("/search", applicantController.searchApplicant);

//gets all applicants but limit to x. 
//eg., http://localhost:3000/applicants/pagination?page=1&limit=10
//Though this will work with http://localhost:3000/applicants/pagination


// Get first-time job seekers
router.get('/first-time-job-seekers', applicantController.getFirstTimeJobSeekers);

// Get first-time job seekers with pagination
router.get('/first-time-job-seekers/paginated', applicantController.getFirstTimeJobSeekersPagination);


router.get("/pagination", applicantController.getAllApplicantsPagination);

//gets all applicants
router.get("/", applicantController.getAllApplicants)

//we will receive an object literal from the frontend that describes the filter
router.get("/filter", applicantController.getApplicantsFilter)

router.get("/filter/for-excel-export", applicantController.getApplicantsFilterForExelExport)

//gets a specific applicant
router.get("/:applicant_id", applicantController.getApplicant);

// In applicantRoutes.js
router.get("/filter/first-time-job-seekers", applicantController.getApplicantsFirstTimeJobSeekersFilter);


module.exports = router;