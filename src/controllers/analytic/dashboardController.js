const pool = require("../../config/db");

/**
 * Get summary metrics for the dashboard
 */
exports.getDashboardSummary = async (req, res) => {
    try {
        const { company_id } = req.query;

        let summaryQuery;
        let queryParams = [];

        if (company_id) {
            summaryQuery = `
        SELECT
          (SELECT COUNT(*) FROM ats_applicant_trackings WHERE company_id = ?) AS total_applicants,
          (SELECT COUNT(*) FROM ats_applicant_trackings t
           JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
           WHERE t.company_id = ? AND p.status = 'JOB_OFFER_ACCEPTED') AS hired_applicants,
          (SELECT COUNT(*) FROM ats_applicant_trackings t
           JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
           WHERE t.company_id = ? AND p.stage = 'INTERVIEW_SCHEDULE') AS in_interview,
          (SELECT COUNT(*) FROM sl_company_jobs WHERE company_id = ? AND is_open = 1) AS open_positions
      `;
            queryParams = [company_id, company_id, company_id, company_id];
        } else {
            summaryQuery = `
        SELECT
          (SELECT COUNT(*) FROM ats_applicant_trackings) AS total_applicants,
          (SELECT COUNT(*) FROM ats_applicant_trackings t
           JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
           WHERE p.status = 'JOB_OFFER_ACCEPTED') AS hired_applicants,
          (SELECT COUNT(*) FROM ats_applicant_trackings t
           JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
           WHERE p.stage = 'INTERVIEW_SCHEDULE') AS in_interview,
          (SELECT COUNT(*) FROM sl_company_jobs WHERE is_open = 1) AS open_positions
      `;
        }

        const [summary] = await pool.execute(summaryQuery, queryParams);

        res.status(200).json({
            success: true,
            data: summary[0]
        });
    } catch (error) {
        console.error("Error fetching dashboard summary:", error.message);
        res.status(500).json({ message: "Failed to fetch dashboard summary" });
    }
};

/**
 * Get applicant status distribution
 */
exports.getApplicantStatusDistribution = async (req, res) => {
    try {
        const { company_id } = req.query;

        let statusQuery;
        let queryParams = [];

        if (company_id) {
            statusQuery = `
        SELECT 
          p.stage,
          p.status,
          COUNT(*) as count
        FROM ats_applicant_trackings t
        JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
        WHERE t.company_id = ?
        GROUP BY p.stage, p.status
        ORDER BY p.stage, count DESC
      `;
            queryParams = [company_id];
        } else {
            statusQuery = `
        SELECT 
          p.stage,
          p.status,
          COUNT(*) as count
        FROM ats_applicant_trackings t
        JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
        GROUP BY p.stage, p.status
        ORDER BY p.stage, count DESC
      `;
        }

        const [statusDistribution] = await pool.execute(statusQuery, queryParams);

        res.status(200).json({
            success: true,
            data: statusDistribution
        });
    } catch (error) {
        console.error("Error fetching applicant status distribution:", error.message);
        res.status(500).json({ message: "Failed to fetch applicant status distribution" });
    }
};

/**
 * Get applicant source distribution
 */
exports.getApplicantSourceDistribution = async (req, res) => {
    try {
        const { company_id } = req.query;

        let sourceQuery;
        let queryParams = [];

        if (company_id) {
            sourceQuery = `
          SELECT 
            discovered_at AS applied_source, 
            COUNT(*) as count
          FROM ats_applicants a
          JOIN ats_applicant_trackings t ON a.applicant_id = t.applicant_id
          WHERE t.company_id = ?
          GROUP BY discovered_at
          ORDER BY count DESC
        `;
            queryParams = [company_id];
        } else {
            sourceQuery = `
          SELECT 
            discovered_at AS applied_source, 
            COUNT(*) as count
          FROM ats_applicants
          GROUP BY discovered_at
          ORDER BY count DESC
        `;
        }

        const [sourceDistribution] = await pool.execute(sourceQuery, queryParams);

        res.status(200).json({
            success: true,
            data: sourceDistribution
        });
    } catch (error) {
        console.error("Error fetching applicant source distribution:", error.message);
        res.status(500).json({ message: "Failed to fetch applicant source distribution" });
    }
};

/**
 * Get job position analytics
 */
exports.getJobPositionAnalytics = async (req, res) => {
    try {
        const { company_id } = req.query;

        let jobPositionQuery;
        let queryParams = [];

        if (company_id) {
            jobPositionQuery = `
        SELECT 
          j.job_id,
          j.title,
          COUNT(t.tracking_id) as applicant_count,
          SUM(CASE WHEN p.stage = 'JOB_OFFER' AND p.status = 'JOB_OFFER_ACCEPTED' THEN 1 ELSE 0 END) as hired_count
        FROM sl_company_jobs j
        LEFT JOIN ats_applicant_trackings t ON j.job_id = t.position_id
        LEFT JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
        WHERE j.company_id = ?
        GROUP BY j.job_id, j.title
        ORDER BY applicant_count DESC
      `;
            queryParams = [company_id];
        } else {
            jobPositionQuery = `
        SELECT 
          j.job_id,
          j.title,
          COUNT(t.tracking_id) as applicant_count,
          SUM(CASE WHEN p.stage = 'JOB_OFFER' AND p.status = 'JOB_OFFER_ACCEPTED' THEN 1 ELSE 0 END) as hired_count
        FROM sl_company_jobs j
        LEFT JOIN ats_applicant_trackings t ON j.job_id = t.position_id
        LEFT JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
        GROUP BY j.job_id, j.title
        ORDER BY applicant_count DESC
      `;
        }

        const [jobPositionData] = await pool.execute(jobPositionQuery, queryParams);

        res.status(200).json({
            success: true,
            data: jobPositionData
        });
    } catch (error) {
        console.error("Error fetching job position analytics:", error.message);
        res.status(500).json({ message: "Failed to fetch job position analytics" });
    }
};

/**
 * Get monthly applicant trends
 */
exports.getMonthlyApplicantTrends = async (req, res) => {
    try {
        const { company_id, year } = req.query;
        const currentYear = year || new Date().getFullYear();

        let monthlyTrendsQuery;
        let queryParams = [];

        if (company_id) {
            monthlyTrendsQuery = `
        SELECT 
          MONTH(t.created_at) as month,
          COUNT(*) as applicant_count,
          SUM(CASE WHEN p.stage = 'JOB_OFFER' AND p.status = 'JOB_OFFER_ACCEPTED' THEN 1 ELSE 0 END) as hired_count
        FROM ats_applicant_trackings t
        LEFT JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
        WHERE t.company_id = ? AND YEAR(t.created_at) = ?
        GROUP BY MONTH(t.created_at)
        ORDER BY month
      `;
            queryParams = [company_id, parseInt(currentYear)];
        } else {
            monthlyTrendsQuery = `
        SELECT 
          MONTH(t.created_at) as month,
          COUNT(*) as applicant_count,
          SUM(CASE WHEN p.stage = 'JOB_OFFER' AND p.status = 'JOB_OFFER_ACCEPTED' THEN 1 ELSE 0 END) as hired_count
        FROM ats_applicant_trackings t
        LEFT JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
        WHERE YEAR(t.created_at) = ?
        GROUP BY MONTH(t.created_at)
        ORDER BY month
      `;
            queryParams = [parseInt(currentYear)];
        }

        const [monthlyTrends] = await pool.execute(monthlyTrendsQuery, queryParams);

        // Fill in missing months with zero counts
        const completeMonthlyTrends = Array(12).fill().map((_, idx) => {
            const existingData = monthlyTrends.find(item => item.month === idx + 1);
            return existingData || { month: idx + 1, applicant_count: 0, hired_count: 0 };
        });

        res.status(200).json({
            success: true,
            data: completeMonthlyTrends
        });
    } catch (error) {
        console.error("Error fetching monthly applicant trends:", error.message);
        res.status(500).json({ message: "Failed to fetch monthly applicant trends" });
    }
};

/**
 * Get recent applicants
 */
exports.getRecentApplicants = async (req, res) => {
    try {
        const { company_id } = req.query;
        // Default limit to 10 if not provided
        let limit = 10;

        // Only attempt to parse limit if it exists in the query
        if (req.query.limit) {
            limit = parseInt(req.query.limit, 10);
            // Ensure it's a positive number
            if (isNaN(limit) || limit <= 0) {
                limit = 10;
            }
        }

        let recentApplicantsQuery;
        let queryParams = [];

        if (company_id) {
            // For MySQL2, modify the query to use direct integer in LIMIT instead of parameterized value
            recentApplicantsQuery = `
          SELECT 
            a.applicant_id,
            a.first_name,
            a.middle_name,
            a.last_name,
            c.email_1,
            j.title as position,
            p.status,
            t.created_at as applied_date
          FROM ats_applicants a
          JOIN ats_contact_infos c ON a.contact_id = c.contact_id
          JOIN ats_applicant_trackings t ON a.applicant_id = t.applicant_id
          JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
          JOIN sl_company_jobs j ON t.position_id = j.job_id
          WHERE t.company_id = ?
          ORDER BY t.created_at DESC
          LIMIT ${limit}
        `;

            queryParams = [company_id];

        } else {
            recentApplicantsQuery = `
          SELECT 
            a.applicant_id,
            a.first_name,
            a.middle_name,
            a.last_name,
            c.email_1,
            j.title as position,
            p.status,
            t.created_at as applied_date
          FROM ats_applicants a
          JOIN ats_contact_infos c ON a.contact_id = c.contact_id
          JOIN ats_applicant_trackings t ON a.applicant_id = t.applicant_id
          JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
          JOIN sl_company_jobs j ON t.position_id = j.job_id
          ORDER BY t.created_at DESC
          LIMIT ${limit}
        `;

            queryParams = [];
        }

        console.log("Query:", recentApplicantsQuery);
        console.log("Params:", queryParams);

        const [recentApplicants] = await pool.execute(recentApplicantsQuery, queryParams);

        res.status(200).json({
            success: true,
            data: recentApplicants
        });
    } catch (error) {
        console.error("Error fetching recent applicants:", error.message, error.stack);
        res.status(500).json({ message: "Failed to fetch recent applicants" });
    }
};
/**
 * Get interview schedule analytics
 */
exports.getInterviewScheduleAnalytics = async (req, res) => {
    try {
        const { company_id } = req.query;
        const days = req.query.days ? parseInt(req.query.days) : 7;

        let interviewQuery;
        let queryParams = [];

        if (company_id) {
            interviewQuery = `
        SELECT 
          i.interview_id,
          i.date_of_interview,
          a.first_name,
          a.middle_name,
          a.last_name,
          j.title as position,
          i.interviewer_id,
          CONCAT(u.first_name, ' ', u.last_name) as interviewer_name
        FROM ats_applicant_interviews i
        JOIN ats_applicant_trackings t ON i.tracking_id = t.tracking_id
        JOIN ats_applicants a ON t.applicant_id = a.applicant_id
        JOIN sl_company_jobs j ON t.position_id = j.job_id
        JOIN hris_user_infos u ON i.interviewer_id = u.user_id
        WHERE t.company_id = ? 
        AND i.date_of_interview >= CURDATE() 
        AND i.date_of_interview <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ORDER BY i.date_of_interview
      `;
            queryParams = [company_id, days];
        } else {
            interviewQuery = `
        SELECT 
          i.interview_id,
          i.date_of_interview,
          a.first_name,
          a.middle_name,
          a.last_name,
          j.title as position,
          i.interviewer_id,
          CONCAT(u.first_name, ' ', u.last_name) as interviewer_name
        FROM ats_applicant_interviews i
        JOIN ats_applicant_trackings t ON i.tracking_id = t.tracking_id
        JOIN ats_applicants a ON t.applicant_id = a.applicant_id
        JOIN sl_company_jobs j ON t.position_id = j.job_id
        JOIN hris_user_infos u ON i.interviewer_id = u.user_id
        WHERE i.date_of_interview >= CURDATE() 
        AND i.date_of_interview <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ORDER BY i.date_of_interview
      `;
            queryParams = [days];
        }

        const [interviewSchedules] = await pool.execute(interviewQuery, queryParams);

        res.status(200).json({
            success: true,
            data: interviewSchedules
        });
    } catch (error) {
        console.error("Error fetching interview schedule analytics:", error.message);
        res.status(500).json({ message: "Failed to fetch interview schedule analytics" });
    }
};

/**
 * Get hiring funnel metrics
 */
exports.getHiringFunnelMetrics = async (req, res) => {
    try {
        const { company_id, position_id, date_from, date_to } = req.query;

        let hiringFunnelQuery = `
      SELECT 
        COUNT(*) AS total_applications,
        SUM(CASE WHEN p.stage = 'PRE_SCREENING' THEN 1 ELSE 0 END) AS pre_screening,
        SUM(CASE WHEN p.stage = 'INTERVIEW_SCHEDULE' THEN 1 ELSE 0 END) AS interview_stage,
        SUM(CASE WHEN p.stage = 'JOB_OFFER' AND p.status != 'JOB_OFFER_ACCEPTED' THEN 1 ELSE 0 END) AS job_offer_stage,
        SUM(CASE WHEN p.status = 'JOB_OFFER_ACCEPTED' THEN 1 ELSE 0 END) AS hired
      FROM ats_applicant_trackings t
      JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
      WHERE 1=1
    `;

        let queryParams = [];

        if (company_id) {
            hiringFunnelQuery += " AND t.company_id = ?";
            queryParams.push(company_id);
        }

        if (position_id) {
            hiringFunnelQuery += " AND t.position_id = ?";
            queryParams.push(position_id);
        }

        if (date_from) {
            hiringFunnelQuery += " AND t.created_at >= ?";
            queryParams.push(date_from);
        }

        if (date_to) {
            hiringFunnelQuery += " AND t.created_at <= ?";
            queryParams.push(date_to);
        }

        const [hiringFunnel] = await pool.execute(hiringFunnelQuery, queryParams);

        res.status(200).json({
            success: true,
            data: hiringFunnel[0]
        });
    } catch (error) {
        console.error("Error fetching hiring funnel metrics:", error.message);
        res.status(500).json({ message: "Failed to fetch hiring funnel metrics" });
    }
};

/**
 * Get time-to-hire metrics
 */
exports.getTimeToHireMetrics = async (req, res) => {
    try {
        const { company_id, position_id } = req.query;

        let timeToHireQuery = `
      SELECT 
        j.job_id,
        j.title,
        AVG(DATEDIFF(
          (SELECT MAX(changed_at) FROM ats_applicant_status_history 
           WHERE progress_id = t.progress_id AND new_status = 'JOB_OFFER_ACCEPTED'), 
          t.created_at
        )) AS avg_days_to_hire
      FROM ats_applicant_trackings t
      JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
      JOIN sl_company_jobs j ON t.position_id = j.job_id
      WHERE p.status = 'JOB_OFFER_ACCEPTED'
    `;

        let queryParams = [];

        if (company_id) {
            timeToHireQuery += " AND t.company_id = ?";
            queryParams.push(company_id);
        }

        if (position_id) {
            timeToHireQuery += " AND t.position_id = ?";
            queryParams.push(position_id);
        }

        timeToHireQuery += " GROUP BY j.job_id, j.title";

        const [timeToHireData] = await pool.execute(timeToHireQuery, queryParams);

        res.status(200).json({
            success: true,
            data: timeToHireData
        });
    } catch (error) {
        console.error("Error fetching time-to-hire metrics:", error.message);
        res.status(500).json({ message: "Failed to fetch time-to-hire metrics" });
    }
};