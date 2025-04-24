const express = require("express");
const router = express.Router();
const notificationController = require("../../controllers/notification/notificationController");

router.get("/", notificationController.getNotification);
router.delete("/remove/:applicant_id", notificationController.removeFromNotification);

module.exports = router;