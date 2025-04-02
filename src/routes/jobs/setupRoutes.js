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

router.put("/:setupId", updateSetup);

router.delete("/:setupId", deleteSetup);

module.exports = router;
