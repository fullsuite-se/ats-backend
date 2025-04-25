const express = require("express");
const discoveredSourceController = require("../../controllers/company/discoveredSourceController");
const router = express.Router();

router.get("/all", discoveredSourceController.getAllDiscoveredSource);

module.exports = router;
