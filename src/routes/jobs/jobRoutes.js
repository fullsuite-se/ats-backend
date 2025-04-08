const express = require("express");
const jobController = require("../../controllers/jobs/jobController");

const router = express.Router();

router.get("/", jobController.getJobs);

router.get("/open", jobController.getOpenJobs);

router.get("/close", jobController.getCloseJobs);

router.get("/:industryId", jobController.getFilteredAllJobsByIndustry);

router.get("/open-filter/:industryId", jobController.getFilteredOpenJobs);

router.get("/search/:searchVal", jobController.getSearchedJob)

router.get("/industries/count", jobController.getIndustriesCount)

router.get("/open/count", jobController.getOpenJobsCount);

router.get("/close/count", jobController.getClosedJobsCount);

router.get("/details/:id", jobController.getJobDetails);

router.post("/assessment-url/", jobController.getJobAssessmentUrl);

router.get(
  "/filter-status/:isOpen",
  jobController.getJobsAdminFilteredByStatus
);

router.post("/", jobController.insertJob);

router.put("/:jobId", jobController.updateJob);

router.delete("/:jobId", jobController.deleteJob);

router.get("/search/:searchVal", jobController.searchJob);

module.exports = router;
