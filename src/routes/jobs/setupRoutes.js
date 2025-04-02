const express = require("express");
const {
  getAllSetups,
  insertSetup,
  updateSetup,
  deleteSetup,
} = require("../../controllers/jobs/setupController.js");

const router = express.Router();

router.get("/", getAllSetups);

router.post("/", insertSetup);

router.post("/:setupId", updateSetup);

router.post("/:setupId", deleteSetup);

module.exports = router;
