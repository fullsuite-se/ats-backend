const express = require("express");
const router = express.Router();
const interviewController = require("../../controllers/interview/interviewController");


// /interview - post
router.post('/', interviewController.addInterview);

// /interview - get
router.get('/', interviewController.getInterview)

router.post('/note', interviewController.addNote)

router.put('/note', interviewController.editNote);

router.get('/export/:applicant_id/:tracking_id', interviewController.exportDiscussionInterview);

module.exports = router;