const express = require("express");
const industryController = require("../../controllers/jobs/industryController");

const router = express.Router();

router.get("/get-all-industries", industryController.getAllIndustries);

router.get("/get-all-industries-hr", industryController.getAllIndustriesHR);

router.get("/get-all-industries-pr", industryController.getAllIndustriesPR);

router.post("/add-industry", industryController.insertIndustry);

router.post("/edit-industry", industryController.updateIndustry);

router.post("/delete-industry", industryController.deleteIndustry);

module.exports = router;
