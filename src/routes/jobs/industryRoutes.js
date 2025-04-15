const express = require("express");
const industryController = require("../../controllers/jobs/industryController");

const router = express.Router();

router.get("/", industryController.getAllIndustries);

router.get("/hr", industryController.getAllIndustriesHR);

router.get("/pr", industryController.getAllIndustriesPR);

router.patch("/pr", industryController.patchIndustryImagePR);

router.post("/", industryController.insertIndustry);

router.put("/:industryId", industryController.updateIndustry);

router.delete("/:industryId", industryController.deleteIndustry);

module.exports = router;
