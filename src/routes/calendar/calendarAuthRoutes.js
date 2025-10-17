const express = require("express");
const router = express.Router();
const { setCredentialsFromCookies } = require("../../middlewares/calendarAuthMiddleware");
const {
  getAuthUrl,
  oauthCallback,
  logout,
  getUserInfo,
} = require("../../controllers/calendar/calendarAuthController");

router.get("/url", getAuthUrl);
router.get("/callback", oauthCallback);
router.post("/logout", logout);
router.get("/me", setCredentialsFromCookies, getUserInfo);

module.exports = router;