const express = require("express");
const appliedSourceController = require("../../controllers/company/appliedSourceController");
const router = express.Router();

router.get("/all", appliedSourceController.getAllAppliedSource);

module.exports = router;
