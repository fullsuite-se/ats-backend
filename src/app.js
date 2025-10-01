// server.js
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./config/db");

const express = require("express");
const app = express();

// --------------------- Middleware --------------------- //

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Parse requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());

// --------------------- CORS Setup --------------------- //
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
const CLIENT_ORIGIN_FS = process.env.CLIENT_ORIGIN_FS; 
const CLIENT_ORIGIN_PREVIEW = process.env.CLIENT_ORIGIN_PREVIEW; 

const allowedOrigins = [
  CLIENT_ORIGIN,
  CLIENT_ORIGIN_FS,
  CLIENT_ORIGIN_PREVIEW,
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

console.log("Client Origin: ", CLIENT_ORIGIN);

// --------------------- Cron Jobs --------------------- //
const updateStatusCronJob = require("./controllers/cronjob/updateStatus");
updateStatusCronJob();

// --------------------- Routes --------------------- //

// Auth
const loginRoutes = require("./routes/auth/loginRoutes");
const registerRoutes = require("./routes/auth/registerRoutes");

// Applicants
const applicantRoutes = require("./routes/applicant/applicantRoutes");
const addApplicantRoutes = require("./routes/applicant/addApplicantRoutes");
const editApplicantRoutes = require("./routes/applicant/editApplicantRoutes");
const updateStatusRoutes = require("./routes/applicant/updateStatusRoutes");
const checkApplicantRoutes = require("./routes/applicant/checkApplicantRoutes");
const pendingApplicantRoutes = require("./routes/applicant/pendingApplicantRoutes");
const deleteApplicantRoutes = require("./routes/applicant/deleteApplicantRoutes");

// Interview
const interviewRoutes = require("./routes/interview/interviewRoutes");

// Company
const positionRoutes = require("./routes/company/positionRoutes");
const appliedSourceRoutes = require("./routes/company/appliedSourceRoutes");
const discoveredSourceRoutes = require("./routes/company/discoveredSourceRoutes");

// Analytics
const metricRoutes = require("./routes/analytic/metricsRoutes");
const graphsRoutes = require("./routes/analytic/graphsRoutes");
const dashboardRoutes = require("./routes/analytic/dashboardRoutes");

// Counter
const applicantCounterRoutes = require("./routes/counter/applicantCounterRoute");

// Notification
const notificationRoutes = require("./routes/notification/notificationRoutes");

// Email
const emailRoutes = require("./routes/email/emailRoutes");

// User
const userRoutes = require("./routes/user/userRoutes");
const userConfigurationRoutes = require("./routes/userConfiguration/userConfigurationRoutes");

// Misc
const statusRoutes = require("./routes/status/statusRoutes");

// Upload
const uploadRoutes = require("./routes/upload/uploadRoutes");

// Industries & Jobs
const industryRoutes = require("./routes/jobs/industryRoutes");
const jobRoutes = require("./routes/jobs/jobRoutes");
const setupRoutes = require("./routes/jobs/setupRoutes");

// Status History
const statusHistoryRoutes = require("./routes/applicant/statHistoryRoutes");

// Password
const passwordRoutes = require("./routes/password/passwordRoutes");

// Calendar
const calendarAuthRoutes = require("./routes/calendar/calendarAuthRoutes");
const calendarRoutes = require("./routes/calendar/calendarRoutes");

// --------------------- Apply Routes --------------------- //

// Applicants
app.use("/applicants/pending", pendingApplicantRoutes);
app.use("/applicants", applicantRoutes);
app.use("/applicants/add", addApplicantRoutes);
app.use("/applicants/check", checkApplicantRoutes);
app.use("/applicant/edit", editApplicantRoutes);
app.use("/applicant/update/status", updateStatusRoutes);
app.use("/applicants/delete", deleteApplicantRoutes);

// Auth
app.use("/auth", loginRoutes);
app.use("/auth", registerRoutes);
app.use("/auth", calendarAuthRoutes); // calendar auth

// Analytics
app.use("/analytics/dashboard", dashboardRoutes);
app.use("/analytic/metrics", metricRoutes);
app.use("/analytic/graphs", graphsRoutes);

// Counter
app.use("/counter", applicantCounterRoutes);

// Interview
app.use("/interview", interviewRoutes);

// Notification
app.use("/notification", notificationRoutes);

// Email
app.use("/email", emailRoutes);

// Company
app.use("/company", positionRoutes);
app.use("/company/sources", appliedSourceRoutes);
app.use("/company/discovered", discoveredSourceRoutes);

// User
app.use("/user", userRoutes);
app.use("/user-configuration", userConfigurationRoutes);

// Misc
app.use("/status", statusRoutes);

// Upload
app.use("/upload", uploadRoutes);

// Industries & Jobs
app.use("/industries", industryRoutes);
app.use("/jobs", jobRoutes);
app.use("/setups", setupRoutes);

// Status History
app.use("/applicant/status-history", statusHistoryRoutes);

// Password
app.use("/password", passwordRoutes);

// Calendar
app.use("/api/calendar", calendarRoutes);

// --------------------- Protected Route --------------------- //
const verifyToken = require("./middlewares/verifyToken");
app.get("/protected", verifyToken, (req, res) => {
  const { user_id, user_email } = req.user;
  res.json({ message: "okay", user_id, user_email });
});

// --------------------- Database Test --------------------- //
const testConnection = async () => {
  try {
    const results = await pool.query("SELECT * FROM ats_applicants LIMIT 1");
    console.log("✅ Connected to database");
  } catch (error) {
    console.error("❌ DB Connection Error:", error.message);
  }
};

testConnection();

module.exports = app;
