const express = require("express");
require("dotenv").config();
const router = express.Router();

const userController = require("../../controllers/user/userController");

const verifyToken = require("../../middlewares/verifyToken");

router.get('/getuserinfo', verifyToken, userController.getUserInfo);
// router.get('/user-accounts', verifyToken, userController.getAllUserAccounts);
router.get('/user-accounts', userController.getAllUserAccounts);

router.post('/create-user', userController.createUserAccount);

router.get('/job-titles', userController.job_titles);

router.get('/service-features', userController.service_features);

router.put("/user-management/:id", userController.updateUserAccount);

router.put("/activate/:user_id", userController.activateUserAccount);

router.put("/deactivate/:user_id", userController.deactivateUserAccount);
module.exports = router;