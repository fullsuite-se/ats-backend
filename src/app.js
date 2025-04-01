const path = require("path");
const fs = require("fs");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./config/db");

const express = require("express");
const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Disable CORS protection from this react project origin
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
// disable cors protection from FS website.
const CLIENT_ORIGIN_FS = process.env.CLIENT_ORIGIN_FS;
app.use(
  cors({
    origin: [CLIENT_ORIGIN, CLIENT_ORIGIN_FS, "http://localhost:5173"],
    credentials: true,
  })
);

// Cron Jobs
const updateStatusCronJob = require("./controllers/cronjob/updateStatus");
updateStatusCronJob();

// auth
const loginRoutes = require("./routes/auth/loginRoutes");
const registerRoutes = require("./routes/auth/registerRoutes");
// applicant
const applicantRoutes = require("./routes/applicant/applicantRoutes");
const addApplicantRoutes = require("./routes/applicant/addApplicantRoutes");
const editApplicantRoutes = require("./routes/applicant/editApplicantRoutes");
const updateStatusRoutes = require("./routes/applicant/updateStatusRoutes");

// interview
const interviewRoutes = require("./routes/interview/interviewRoutes");

// company
const positionRoutes = require("./routes/company/positionRoutes");

// analytic
const metricRoutes = require("./routes/analytic/metricsRoutes");
const graphsRoutes = require("./routes/analytic/graphsRoutes");

// counter
const applicantCounterRoutes = require("./routes/counter/applicantCounterRoute");

// notification
const notificationRoutes = require("./routes/notification/notificationRoutes");

// email
const emailRoutes = require("./routes/email/emailRoutes");

// user
const userRoutes = require("./routes/user/userRoutes");

// misc (for fetching config from db)
const statusRoutes = require("./routes/status/statusRoutes");

// upload
const uploadRoutes = require("./routes/upload/uploadRoutes");

// industries
const industryRoutes = require("./routes/jobs/industryRoutes");

// jobs
const jobRoutes = require("./routes/jobs/jobRoutes");

// configuration
const userConfigurationRoutes = require("./routes/userConfiguration/userConfigurationRoutes");

// status history
const statusHistoryRoutes = require("./routes/applicant/statHistoryRoutes");

// Routes
app.use("/applicant/status-history", statusHistoryRoutes);
app.use("/applicants", applicantRoutes);
app.use("/applicants/add", addApplicantRoutes);
app.use("/applicant/edit", editApplicantRoutes);
app.use("/applicant/update/status", updateStatusRoutes);
app.use("/counter", applicantCounterRoutes);
app.use("/interview", interviewRoutes);
app.use("/auth", loginRoutes);
app.use("/auth", registerRoutes);
app.use("/notification", notificationRoutes);
app.use("/analytic/metrics", metricRoutes);
app.use("/analytic/graphs", graphsRoutes);
app.use("/email", emailRoutes);
app.use("/company", positionRoutes);
app.use("/user", userRoutes);
app.use("/status", statusRoutes);
app.use("/upload", uploadRoutes);
app.use("/industries", industryRoutes);
app.use("/jobs", jobRoutes);
app.use("/user-configuration", userConfigurationRoutes);

const verifyToken = require("./middlewares/verifyToken");

app.get("/protected", verifyToken, (req, res) => {
  const { user_id, user_email } = req.user;
  console.log(user_id);
  console.log(user_email);

  res.json({ message: "okay" });
});

// Function for testing if connected to the database and call it when server starts
const testConnection = async () => {
  try {
    const results = await pool.query("SELECT * FROM ats_applicants");
    console.log("connected to database");
  } catch (error) {
    console.error(error.message);
  }
};

testConnection();

module.exports = app;
