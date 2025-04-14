const express = require("express");
const router = express.Router();
const passwordController = require("../../controllers/password/passwordController"); 

router.post("/resset-request", passwordController.requestReset );
router.post("/verify-otp", passwordController.verifyOTP)
module.exports = router;