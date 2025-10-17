// server.js
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
require("dotenv").config();

const pool = require("./config/db");
const express = require("express");
const app = express();

// --------------------- Middleware --------------------- //

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Parse incoming requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());

// --------------------- CORS Setup --------------------- //
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  process.env.CLIENT_ORIGIN_FS,
  process.env.CLIENT_ORIGIN_PREVIEW,
  "http://localhost:5173",
  "http://192.168.88.244",
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Handle preflight requests for all routes
app.options("*", cors({
  origin: allowedOrigins,
  credentials: true,
}));

console.log("Allowed origins:", allowedOrigins);

// --------------------- Cron Jobs --------------------- //
require("./controllers/cronjob/updateStatus")();

// --------------------- Routes --------------------- //

// Auth
app.use("/auth", require("./routes/auth/loginRoutes"));
app.use("/auth", require("./routes/auth/registerRoutes"));
app.use("/auth", require("./routes/calendar/calendarAuthRoutes"));

// Applicants
app.use("/applicants/pending", require("./routes/applicant/pendingApplicantRoutes"));
app.use("/applicants", require("./routes/applicant/applicantRoutes"));
app.use("/applicants/add", require("./routes/applicant/addApplicantRoutes"));
app.use("/applicants/check", require("./routes/applicant/checkApplicantRoutes"));
app.use("/applicant/edit", require("./routes/applicant/editApplicantRoutes"));
app.use("/applicant/update/status", require("./routes/applicant/updateStatusRoutes"));
app.use("/applicants/delete", require("./routes/applicant/deleteApplicantRoutes"));

// Interview
app.use("/interview", require("./routes/interview/interviewRoutes"));

// Company
app.use("/company", require("./routes/company/positionRoutes"));
app.use("/company/sources", require("./routes/company/appliedSourceRoutes"));
app.use("/company/discovered", require("./routes/company/discoveredSourceRoutes"));

// Analytics
app.use("/analytics/dashboard", require("./routes/analytic/dashboardRoutes"));
app.use("/analytic/metrics", require("./routes/analytic/metricsRoutes"));
app.use("/analytic/graphs", require("./routes/analytic/graphsRoutes"));

// Counter
app.use("/counter", require("./routes/counter/applicantCounterRoute"));

// Notification
app.use("/notification", require("./routes/notification/notificationRoutes"));

// Email
app.use("/email", require("./routes/email/emailRoutes"));

// User
app.use("/user", require("./routes/user/userRoutes"));
app.use("/user-configuration", require("./routes/userConfiguration/userConfigurationRoutes"));

// Misc
app.use("/status", require("./routes/status/statusRoutes"));
app.use("/upload", require("./routes/upload/uploadRoutes"));

// Jobs & Industries
app.use("/industries", require("./routes/jobs/industryRoutes"));
app.use("/jobs", require("./routes/jobs/jobRoutes"));
app.use("/setups", require("./routes/jobs/setupRoutes"));

// Status History
app.use("/applicant/status-history", require("./routes/applicant/statHistoryRoutes"));

// Password
app.use("/password", require("./routes/password/passwordRoutes"));

// Calendar
app.use("/api/calendar", require("./routes/calendar/calendarRoutes"));

// --------------------- Protected Route --------------------- //
const verifyToken = require("./middlewares/verifyToken");
app.get("/protected", verifyToken, (req, res) => {
  const { user_id, user_email } = req.user;
  res.json({ message: "okay", user_id, user_email });
});

// --------------------- Database Test --------------------- //
(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Connected to database");
  } catch (error) {
    console.error("❌ DB Connection Error:", error.message);
  }
})();

module.exports = app;