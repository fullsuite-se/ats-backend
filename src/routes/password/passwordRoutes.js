const express = require("express");
const router = express.Router();
const passwordController = require("../../controllers/password/passwordController"); 

router.post("/resset-request", passwordController.requestReset );
router.post("/verify-otp", passwordController.verifyOTP); 
router.post("/reset-password", passwordController.resetPassword);
module.exports = router;