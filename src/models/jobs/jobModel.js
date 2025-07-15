const pool = require("../../config/db");
const { getCloseJobs } = require("../../controllers/jobs/jobController");
const { search } = require("../../routes/jobs/jobRoutes");

const Job = {
  getAllShownJobs: async () => {
    const query = `
      SELECT 
        job_id AS jobId, title AS jobTitle, industry_id AS industryId, industry_name AS industryName,
        employment_type AS employmentType, sl_company_jobs.setup_id AS setupId, setup_name AS setupName,
        description, salary_min AS salaryMin, salary_max AS salaryMax, responsibility, requirement,
        preferred_qualification AS preferredQualification, is_open AS isOpen, is_shown AS isShown
      FROM sl_company_jobs
      JOIN sl_company_jobs_setups ON sl_company_jobs_setups.setup_id = sl_company_jobs.setup_id
      JOIN sl_job_industries ON sl_company_jobs.industry_id = sl_job_industries.job_ind_id
      WHERE is_shown = 1
    `;
    const [rows] = await pool.query(query);
    return rows;
  },

  getAllJobs: async () => {
    const query = `
      SELECT 
        job_id AS jobId, title AS jobTitle, industry_id AS industryId, industry_name AS industryName,
        employment_type AS employmentType, sl_company_jobs.setup_id AS setupId, setup_name AS setupName,
        description, salary_min AS salaryMin, salary_max AS salaryMax, responsibility, requirement,
        preferred_qualification AS preferredQualification, is_open AS isOpen, is_shown AS isShown
      FROM sl_company_jobs
      JOIN sl_company_jobs_setups ON sl_company_jobs_setups.setup_id = sl_company_jobs.setup_id
      JOIN sl_job_industries ON sl_company_jobs.industry_id = sl_job_industries.job_ind_id
    `;
    const [rows] = await pool.query(query);
    return rows;
  },

  getJob: async (jobId) => {
    const query = `
      SELECT 
        job_id AS jobId, title AS jobTitle, industry_id AS industryId, industry_name AS industryName,
        employment_type AS employmentType, sl_company_jobs.setup_id AS setupId, setup_name AS setupName,
        description, salary_min AS salaryMin, salary_max AS salaryMax, responsibility, requirement,
        preferred_qualification AS preferredQualification, is_open AS isOpen, is_shown AS isShown
      FROM sl_company_jobs
      JOIN sl_company_jobs_setups ON sl_company_jobs_setups.setup_id = sl_company_jobs.setup_id
      JOIN sl_job_industries ON sl_company_jobs.industry_id = sl_job_industries.job_ind_id
      WHERE job_id = ?
    `;
    const [rows] = await pool.query(query, [jobId]);
    return rows;
  },

  getFilteredAllJobs: async (industry_id) => {
    const query = `
      SELECT 
        job_id AS jobId, title AS jobTitle, industry_name AS industryName, employment_type AS employmentType,
        setup_name AS setupName, description, salary_min AS salaryMin, salary_max AS salaryMax, responsibility,
        requirement, preferred_qualification AS preferredQualification, is_open AS isOpen
      FROM sl_company_jobs
      JOIN sl_company_jobs_setups ON sl_company_jobs_setups.setup_id = sl_company_jobs.setup_id
      JOIN sl_job_industries ON sl_company_jobs.industry_id = sl_job_industries.job_ind_id
      WHERE is_shown = 1 AND industry_id = ?
    `;
    const [rows] = await pool.query(query, [industry_id]);
    return rows;
  },

  getOpenJobs: async () => {
    const query = `
      SELECT 
        job_id AS jobId, title AS jobTitle, industry_name AS industryName, employment_type AS employmentType,
        setup_name AS setupName, description, salary_min AS salaryMin, salary_max AS salaryMax, responsibility,
        requirement, preferred_qualification AS preferredQualification, is_open AS isOpen, is_shown AS isShown,
        industry_id AS industryId, sl_company_jobs.setup_id AS setupId
      FROM sl_company_jobs
      JOIN sl_company_jobs_setups ON sl_company_jobs_setups.setup_id = sl_company_jobs.setup_id
      JOIN sl_job_industries ON sl_company_jobs.industry_id = sl_job_industries.job_ind_id
      WHERE is_open = 1 AND is_shown = 1
    `;
    const [rows] = await pool.query(query);
    return rows;
  },

  getCloseJobs: async () => {
    const query = `
      SELECT 
        job_id AS jobId, title AS jobTitle, industry_name AS industryName, employment_type AS employmentType,
        setup_name AS setupName, description, salary_min AS salaryMin, salary_max AS salaryMax, responsibility,
        requirement, preferred_qualification AS preferredQualification, is_open AS isOpen, is_shown AS isShown,
        industry_id AS industryId, sl_company_jobs.setup_id AS setupId
      FROM sl_company_jobs
      JOIN sl_company_jobs_setups ON sl_company_jobs_setups.setup_id = sl_company_jobs.setup_id
      JOIN sl_job_industries ON sl_company_jobs.industry_id = sl_job_industries.job_ind_id
      WHERE is_open = 0 AND is_shown = 1
    `;
    const [rows] = await pool.query(query);
    return rows;
  },

  getFilteredOpenJobs: async (industry_id) => {
    const query = `
      SELECT 
        job_id AS jobId, title AS jobTitle, industry_name AS industryName, employment_type AS employmentType,
        setup_name AS setupName, description, salary_min AS salaryMin, salary_max AS salaryMax, responsibility,
        requirement, preferred_qualification AS preferredQualification, is_open AS isOpen
      FROM sl_company_jobs
      JOIN sl_company_jobs_setups ON sl_company_jobs_setups.setup_id = sl_company_jobs.setup_id
      JOIN sl_job_industries ON sl_company_jobs.industry_id = sl_job_industries.job_ind_id
      WHERE is_shown = 1 AND is_open = 1 AND industry_id = ? 
    `;
    const [rows] = await pool.query(query, [industry_id]);
    return rows;
  },

  getOpenJobsCount: async () => {
    const query = `
      SELECT COUNT(job_id) AS count 
      FROM sl_company_jobs 
      WHERE is_open = 1 AND is_shown = 1
    `;
    const [rows] = await pool.query(query);
    return rows[0];
  },

  getClosedJobsCount: async () => {
    const query = `
      SELECT COUNT(job_id) AS count 
      FROM sl_company_jobs 
      WHERE is_open = 0 AND is_shown = 1
    `;
    const [rows] = await pool.query(query);
    return rows[0];
  },

  getIndustriesCount: async () => {
    const query = `SELECT COUNT(job_ind_id) AS count FROM sl_job_industries`;
    const [rows] = await pool.query(query);
    return rows[0];
  },

  SearchJob: async (searchValue) => {
    const query = `
    SELECT 
        job_id AS jobId, title AS jobTitle, industry_id AS industryId, industry_name AS industryName,
        employment_type AS employmentType, sl_company_jobs.setup_id AS setupId, setup_name AS setupName,
        description, salary_min AS salaryMin, salary_max AS salaryMax, responsibility, requirement,
        preferred_qualification AS preferredQualification, is_open AS isOpen, is_shown AS isShown
      FROM sl_company_jobs
      JOIN sl_company_jobs_setups ON sl_company_jobs_setups.setup_id = sl_company_jobs.setup_id
      JOIN sl_job_industries ON sl_company_jobs.industry_id = sl_job_industries.job_ind_id 
      WHERE title LIKE ?
    `;
    
    const [rows] = await pool.query(query, [searchValue + "%"]);
    return rows;
  },

  getJobDetails: async (job_id) => {
    const query = `
         SELECT 
        job_id AS jobId, title AS jobTitle, industry_name AS industryName, employment_type AS employmentType,
        setup_name AS setupName, description, salary_min AS salaryMin, salary_max AS salaryMax, responsibility,
        requirement, preferred_qualification AS preferredQualification, is_open AS isOpen, responsibility_header AS responsibilityHeader, requirement_header AS requirementHeader, qualification_header AS qualificationHeader
      FROM sl_company_jobs
      JOIN sl_company_jobs_setups ON sl_company_jobs.setup_id = sl_company_jobs_setups.setup_id
      JOIN sl_job_industries ON sl_company_jobs.industry_id = sl_job_industries.job_ind_id
      WHERE is_shown = 1 AND job_id = ?
    `;
    const [rows] = await pool.query(query, [job_id]);
    return rows[0];
  },

  getJobAssessmentUrl: async (job_id) => {
    const query = `
      SELECT assessment_url AS assessmentUrl 
      FROM sl_company_jobs
      INNER JOIN sl_job_industries ON sl_company_jobs.industry_id = sl_job_industries.job_ind_id
      WHERE job_id = ?
    `;
    const [rows] = await pool.query(query, [job_id]);
    return rows[0];
  },

  insertJob: async (newJob) => {
    const query = `INSERT INTO sl_company_jobs SET ?`;
    const [result] = await pool.query(query, newJob);
    return result;
  },

  updateJob: async (job_id, jobUpdates) => {
    const query = `UPDATE sl_company_jobs SET ? WHERE job_id = ?`;
    const [result] = await pool.query(query, [jobUpdates, job_id]);
    return result;
  },

  deleteJob: async (job_id) => {
    const query = `DELETE FROM sl_company_jobs WHERE job_id = ?`;
    const [result] = await pool.query(query, [job_id]);
    return result;
  },
};

module.exports = Job;
