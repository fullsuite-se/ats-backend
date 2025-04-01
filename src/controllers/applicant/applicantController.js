const pool = require("../../config/db");

// /applicants/search?query?
exports.searchApplicant = async (req, res) => {
  try {
    const filters = req.query;
    console.log(filters);

    const conditions = [];
    const values = [];

    console.log(filters);

    if (filters.month) {
      conditions.push("MONTHNAME(a.date_created) = ?");
      values.push(filters.month);
    }
    if (filters.year) {
      conditions.push("YEAR(a.date_created) = ?");
      values.push(filters.year);
    }
    if (filters.position) {
      conditions.push("j.title LIKE ?");
      values.push(`%${filters.position}%`);
    }
    if (filters.searchQuery) {
      conditions.push(`(
                a.first_name LIKE ?
                 OR a.middle_name LIKE ? 
                 OR a.last_name LIKE ?
                 OR c.email_1 LIKE ?
                 OR c.email_2 LIKE ?
                 OR c.email_3 LIKE ?
                 OR c.mobile_number_1 LIKE ?
                 OR c.mobile_number_2 LIKE ? 
                 )`);
      values.push(
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`
      );
    }
    if (filters.status) {
      const statusArray = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      const placeholders = statusArray.map(() => "?").join(", ");
      conditions.push(`p.status IN (${placeholders})`);
      values.push(...statusArray);
    }

    // Ensure at least one condition to avoid syntax error in SQL
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
            SELECT
                a.applicant_id, 
                a.first_name, 
                a.middle_name, 
                a.last_name,
                a.date_created, 
                t.created_at,
                p.status, 
                j.title, 
                p.progress_id
                FROM ats_applicants a
                LEFT JOIN ats_contact_infos c
                    ON a.applicant_id = c.applicant_id
                LEFT JOIN ats_applicant_trackings t
                    ON a.applicant_id = t.applicant_id
                LEFT JOIN ats_applicant_progress p
                    ON t.progress_id = p.progress_id
                LEFT JOIN sl_company_jobs j
                    ON t.position_id = j.job_id
            ${whereClause}
        `;

    const [results] = await pool.execute(sql, values);

    return res.json(results);
  } catch (error) {
    console.error("Error fetching applicants:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

//applicants/
exports.getAllApplicants = async (req, res) => {
  try {
    const sql = `
            SELECT 
                a.applicant_id, 
                a.first_name, 
                a.middle_name, 
                a.last_name, 
                t.tracking_id, 
                t.created_at,
                p.status, 
                p.progress_id,
                j.title
            FROM ats_applicants a
            LEFT JOIN ats_applicant_trackings t ON a.applicant_id = t.applicant_id
            LEFT JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
            LEFT JOIN sl_company_jobs j ON t.position_id = j.job_id;
        `;

    const [results] = await pool.execute(sql);

    if (results) {
      return res.status(201).json(results);
    }
  } catch (error) {
    return res.status(500).json({ error: error });
  }
};

//applicants/
exports.getAllApplicantsPagination = async (req, res) => {
  try {
    console.log("running...");

    // Extract pagination parameters from the request query
    let { page, limit } = req.query;
    page = parseInt(page) || 1; // Default page = 1
    limit = parseInt(limit) || 10; // Default limit = 10

    const offset = (page - 1) * limit;

    // SQL query with LIMIT and OFFSET for pagination
    const sql = `
            SELECT 
                a.applicant_id, 
                a.first_name, 
                a.middle_name, 
                a.last_name, 
                t.applicant_created_at, 
                p.status, 
                p.progress_id,
                j.title
            FROM ats_applicants a
            LEFT JOIN ats_applicant_trackings t ON a.applicant_id = t.applicant_id
            LEFT JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
            LEFT JOIN sl_company_jobs j ON t.position_id = j.job_id
            LIMIT ? OFFSET ?;
        `;

    // Query to count total number of applicants
    const countSql = `SELECT COUNT(*) AS total FROM ats_applicants`;

    // Execute queries
    const [results] = await pool.query(sql, [limit, offset]);
    //const [results] = await pool.execute(sql);
    const [[{ total }]] = await pool.execute(countSql);

    // Return paginated results with metadata
    return res.status(200).json({
      applicants: results,
      totalApplicants: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getApplicantsFilter = async (req, res) => {
  const filters = req.query;
  const conditions = [];
  const values = [];

  console.log(filters);

  if (filters.month) {
    conditions.push("MONTHNAME(a.date_created)= ?");
    values.push(filters.month);
  }
  if (filters.year) {
    conditions.push("YEAR(a.date_created) = ?");
    values.push(filters.year);
  }
  if (filters.position) {
    conditions.push("j.title LIKE ?");
    values.push(`%${filters.position}%`);
  }
  if (filters.status) {
    const statusArray = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    const placeholders = statusArray.map(() => "?").join(", ");
    conditions.push(`p.status IN (${placeholders})`);
    values.push(...statusArray);
  }

  // Construct SQL query
  const baseSql = `
      SELECT
        a.*,
        c.*, 
        p.stage, 
        p.status, 
        j.title, 
        p.progress_id,
        t.created_at
      FROM ats_applicants a
      LEFT JOIN ats_contact_infos c
        ON a.applicant_id = c.applicant_id
      LEFT JOIN ats_applicant_trackings t
        ON a.applicant_id = t.applicant_id
      LEFT JOIN ats_applicant_progress p
        ON t.progress_id = p.progress_id
      LEFT JOIN sl_company_jobs j
        ON t.position_id = j.job_id
    `;

  // Add WHERE clause if filters exist
  const sql =
    conditions.length > 0
      ? `${baseSql} WHERE ${conditions.join(" AND ")}`
      : baseSql;

  try {
    const [results] = await pool.execute(sql, values);
    return res.json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getApplicant = async (req, res) => {
  try {
    const applicant_id = req.params.applicant_id;

    const sql = `
            SELECT 
                a.applicant_id,
                a.first_name,
                a.middle_name,
                a.last_name,
                a.gender,
                a.birth_date,
                a.discovered_at,
                a.cv_link,

                
                c.mobile_number_1,
                c.mobile_number_2,
                c.email_1,
                c.email_2,
                c.email_3,
                
                t.tracking_id,
                t.test_result,
                t.created_at AS applicant_created_at,
                t.created_by AS tracking_created_by,
                t.updated_at AS tracking_updated_at,
                t.updated_by AS tracking_updated_by,
                t.applied_source,
                t.referrer_name,
                
                p.progress_id,
                p.stage,
                p.status,
                p.blacklisted_type,
                p.reason,
                p.updated_at AS progress_updated_at,
                
                j.job_id,
                j.title AS job_title,
                j.description AS job_description,
                j.employment_type,
                j.is_open AS job_is_open,
                j.created_at AS job_created_at,
                j.created_by AS job_created_by

            FROM ats_applicants a

            LEFT JOIN ats_contact_infos c
                ON a.contact_id = c.contact_id

            LEFT JOIN ats_applicant_trackings t
                ON a.applicant_id = t.applicant_id

            LEFT JOIN ats_applicant_progress p
                ON t.progress_id = p.progress_id

            LEFT JOIN sl_company_jobs j
                ON t.position_id = j.job_id
            WHERE a.applicant_id = ?;
        `;

    const values = [applicant_id];

    const [results] = await pool.execute(sql, values);

    if (results.length > 0) {
      return res.status(200).json(results);
    }

    res.status(404).json({ message: "Applicant not found" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};
