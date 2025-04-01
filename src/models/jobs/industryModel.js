const pool = require("../../config/db.js");
const { v7: uuidv7 } = require("uuid");
const { now } = require("../../utils/date");
require("dotenv").config();

exports.getAllIndustries = async () => {
  const query = `
    SELECT job_ind_id AS industryId, industry_name AS industryName, assessment_url AS assessmentUrl 
    FROM sl_job_industries
  `;
  const [industries] = await pool.query(query);
  return industries;
};

exports.getAllIndustriesHR = async () => {
  const query = `
    SELECT job_ind_id AS industryId, industry_name AS industryName, assessment_url AS assessmentUrl,
      CONCAT(hris_user_infos.first_name, ' ', LEFT(hris_user_infos.middle_name, 1), '. ', hris_user_infos.last_name) AS createdBy,
      created_at AS createdAt
    FROM sl_job_industries
    JOIN hris_user_infos ON hris_user_infos.user_id = sl_job_industries.created_by
  `;
  const [industries] = await pool.query(query);
  return industries;
};

exports.getAllIndustriesPR = async () => {
  const query = `
    SELECT job_ind_id AS industryId, industry_name AS industryName, image_url AS imageUrl 
    FROM sl_job_industries
  `;
  const [industries] = await pool.query(query);
  return industries;
};

exports.insertIndustry = async (industryName, assessmentUrl, userId) => {
  const query = `
    INSERT INTO sl_job_industries SET ?
  `;
  const newIndustry = {
    job_ind_id: uuidv7(),
    industry_name: industryName,
    company_id: process.env.COMPANY_ID,
    image_url: null,
    assessment_url: assessmentUrl,
    created_at: now(),
    created_by: userId,
  };
  await pool.query(query, newIndustry);
};

exports.updateIndustry = async (jobIndId, industryName, assessmentUrl) => {
  const query = `
    UPDATE sl_job_industries SET industry_name = ?, assessment_url = ? WHERE job_ind_id = ?
  `;
  const [result] = await pool.query(query, [industryName, assessmentUrl, jobIndId]);
  return result.affectedRows;
};

exports.deleteIndustry = async (industry_id) => {
  const query = `
    DELETE FROM sl_job_industries WHERE job_ind_id = ?
  `;
  const [result] = await pool.query(query, [industry_id]);
  return result.affectedRows;
};
