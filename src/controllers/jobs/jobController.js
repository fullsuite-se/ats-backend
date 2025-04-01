const { v7: uuidv7 } = require("uuid");
const Job = require("../../models/jobs/jobModel.js");
const { now } = require("../../utils/date.js");
require("dotenv").config();

exports.getJobs = async (req, res) => {
  try {
    const jobs = await Job.getAllJobs();
    res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    console.error("Error fetching jobs:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getFilteredAllJobsByIndustry = async (req, res) => {
  try {
    const { industry_id } = req.params;

    if (!industry_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: industry id",
      });
    }

    const filteredJobs = await Job.getFilteredAllJobs(industry_id);
    res.status(200).json({ success: true, data: filteredJobs });
  } catch (err) {
    console.error("Error fetching open jobs:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getOpenJobs = async (req, res) => {
  try {
    const openJobs = await Job.getOpenJobs();
    res.status(200).json({ success: true, data: openJobs });
  } catch (err) {
    console.error("Error fetching open jobs:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getFilteredOpenJobs = async (req, res) => {
  try {
    const { industry_id } = req.params;

    if (!industry_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: industry id",
      });
    }

    const filteredJobs = await Job.getFilteredOpenJobs(industry_id);
    res.status(200).json({ success: true, data: filteredJobs });
  } catch (err) {
    console.error("Error fetching open jobs:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getOpenJobsCount = async (req, res) => {
  try {
    const openJobsCount = await Job.getOpenJobsCount();
    res.status(200).json({ success: true, data: openJobsCount });
  } catch (err) {
    console.error("Error fetching open jobs:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getClosedJobsCount = async (req, res) => {
  try {
    const closedJobsCount = await Job.getClosedJobsCount();
    res.status(200).json({ success: true, data: closedJobsCount });
  } catch (err) {
    console.error("Error fetching open jobs:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getJobDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const jobDetails = await Job.getJobDetails(id);
    res.status(200).json({ success: true, data: jobDetails });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getJobAssessmentUrl = async (req, res) => {
  try {
    const { job_id } = req.body;
    const assessmentUrl = await Job.getJobAssessmentUrl(job_id);
    res.status(200).json({ success: true, data: assessmentUrl });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.searchJob = async (req, res) => {
  try {
    const { search_val } = req.params;
    const searchResults = await Job.searchJob(search_val);
    res.status(200).json({ success: true, data: searchResults });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getJobsAdmin = async (req, res) => {
  try {
    const jobs = await Job.getAllJobsAdmin();
    res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getJobsAdminFilteredByStatus = async (req, res) => {
  try {
    const { is_open } = req.params;
    const jobsFilteredByStatus = await Job.getJobsFilteredByStatus(is_open);
    res.status(200).json({ success: true, data: jobsFilteredByStatus });
  } catch (err) {
    console.error(`Error fetching jobs by status - is_open: ${is_open}`, err.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.insertJob = async (req, res) => {
  try {
    const {
      title,
      industryId,
      employmentType,
      setupId,
      description,
      salaryMin,
      salaryMax,
      responsibility,
      requirement,
      preferredQualification,
      isOpen,
      isShown,
      userId,
    } = req.body;

    if (
      !title ||
      !description ||
      !employmentType ||
      !setupId ||
      !isOpen ||
      !isShown ||
      !industryId
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const newJob = {
      job_id: uuidv7(),
      company_id: process.env.COMPANY_ID,
      title,
      industry_id: industryId,
      employment_type: employmentType,
      setup_id: setupId,
      description,
      salary_min: salaryMin,
      salary_max: salaryMax,
      responsibility,
      requirement,
      preferred_qualification: preferredQualification,
      is_open: isOpen,
      is_shown: isShown,
      created_at: now(),
      created_by: userId,
    };

    await Job.insertJob(newJob);

    res
      .status(201)
      .json({ success: true, message: "Company Job added successfully" });
  } catch (err) {
    console.log("Error inserting company job:", err.message);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const {
      jobId,
      title,
      employmentType,
      setupId,
      description,
      salaryMin,
      salaryMax,
      responsibility,
      requirement,
      preferredQualification,
      isOpen,
      isShown,
      user_id,
    } = req.body;

    if (
      !title ||
      !description ||
      !employmentType ||
      !setupId ||
      isOpen === "" ||
      isOpen === undefined ||
      isShown === "" ||
      isShown === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const updates = {
      title,
      employment_type: employmentType,
      setup_id: setupId,
      description,
      salary_min: salaryMin ?? 0,
      salary_max: salaryMax ?? 0,
      responsibility,
      requirement,
      preferred_qualification: preferredQualification,
      is_open: isOpen,
      is_shown: isShown,
    };

    const updatedJob = await Job.updateJob(jobId, updates);

    if (!updatedJob) {
      return res
        .status(404)
        .json({ success: false, message: "Job not found or not updated" });
    }

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: updatedJob,
    });
  } catch (err) {
    console.log("Error updating job:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { job_id } = req.body;

    if (!job_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: job id",
      });
    }

    const deletedJob = await Job.deleteJob(job_id);

    if (!deletedJob) {
      return res.status(404).json({
        success: false,
        message: "Job not found or already deleted",
      });
    }

    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (err) {
    console.log("Error deleting job:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};
