const pool = require("../../config/db");

/**
 * Get summary metrics for the dashboard
 */
exports.getDashboardSummary = async (req, res) => {
    try {
        const { company_id, month, year } = req.query;

        let summaryQuery;
        let queryParams = [];
        let dateFilter = '';

        // Build date filter condition if month/year provided
        if (month && year) {
            dateFilter = 'AND MONTH(t.created_at) = ? AND YEAR(t.created_at) = ?';
        } else if (month) {
            dateFilter = 'AND MONTH(t.created_at) = ?';
        } else if (year) {
            dateFilter = 'AND YEAR(t.created_at) = ?';
        }

        if (company_id) {
            summaryQuery = `
        SELECT
          (SELECT COUNT(*) FROM ats_applicant_trackings t WHERE t.company_id = ? ${dateFilter}) AS total_applicants,
          (SELECT COUNT(*) FROM ats_applicant_trackings t
           JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
           WHERE t.company_id = ? AND p.status = 'JOB_OFFER_ACCEPTED' ${dateFilter}) AS hired_applicants,
          (SELECT COUNT(*) FROM ats_applicant_trackings t
           JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
           WHERE t.company_id = ? AND p.stage = 'INTERVIEW_SCHEDULE' ${dateFilter}) AS in_interview,
          (SELECT COUNT(*) FROM sl_company_jobs WHERE company_id = ? AND is_open = 1) AS open_positions
      `;
            
            // Add parameters for each query
            queryParams = [company_id];
            if (month && year) queryParams.push(parseInt(month), parseInt(year));
            else if (month) queryParams.push(parseInt(month));
            else if (year) queryParams.push(parseInt(year));
            
            // Repeat parameters for each subquery
            queryParams = [...queryParams, ...queryParams, ...queryParams, company_id];
        } else {
            summaryQuery = `
        SELECT
          (SELECT COUNT(*) FROM ats_applicant_trackings t WHERE 1=1 ${dateFilter}) AS total_applicants,
          (SELECT COUNT(*) FROM ats_applicant_trackings t
           JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
           WHERE p.status = 'JOB_OFFER_ACCEPTED' ${dateFilter}) AS hired_applicants,
          (SELECT COUNT(*) FROM ats_applicant_trackings t
           JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
           WHERE p.stage = 'INTERVIEW_SCHEDULE' ${dateFilter}) AS in_interview,
          (SELECT COUNT(*) FROM sl_company_jobs WHERE is_open = 1) AS open_positions
      `;
            
            if (month && year) queryParams = [parseInt(month), parseInt(year), parseInt(month), parseInt(year), parseInt(month), parseInt(year)];
            else if (month) queryParams = [parseInt(month), parseInt(month), parseInt(month)];
            else if (year) queryParams = [parseInt(year), parseInt(year), parseInt(year)];
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
        const { company_id, month, year } = req.query;

        let statusQuery;
        let queryParams = [];
        let dateFilter = '';

        // Build date filter
        if (month && year) {
            dateFilter = 'AND MONTH(t.created_at) = ? AND YEAR(t.created_at) = ?';
        } else if (month) {
            dateFilter = 'AND MONTH(t.created_at) = ?';
        } else if (year) {
            dateFilter = 'AND YEAR(t.created_at) = ?';
        }

        if (company_id) {
            statusQuery = `
        SELECT 
          p.stage,
          p.status,
          COUNT(*) as count
        FROM ats_applicant_trackings t
        JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
        WHERE t.company_id = ? ${dateFilter}
        GROUP BY p.stage, p.status
        ORDER BY p.stage, count DESC
      `;
            queryParams = [company_id];
            
            // Add date parameters if provided
            if (month && year) queryParams.push(parseInt(month), parseInt(year));
            else if (month) queryParams.push(parseInt(month));
            else if (year) queryParams.push(parseInt(year));
        } else {
            statusQuery = `
        SELECT 
          p.stage,
          p.status,
          COUNT(*) as count
        FROM ats_applicant_trackings t
        JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
        WHERE 1=1 ${dateFilter}
        GROUP BY p.stage, p.status
        ORDER BY p.stage, count DESC
      `;
            
            if (month && year) queryParams = [parseInt(month), parseInt(year)];
            else if (month) queryParams = [parseInt(month)];
            else if (year) queryParams = [parseInt(year)];
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
 * Get applicant source distribution with month/year filtering
 */
exports.getApplicantSourceDistribution = async (req, res) => {
    try {
        const { company_id, month, year } = req.query;
        
        let sourceQuery;
        let queryParams = [];
        let dateFilter = '';
        
        // Build date filter condition
        if (month && year) {
            dateFilter = 'AND MONTH(t.created_at) = ? AND YEAR(t.created_at) = ?';
        } else if (month) {
            dateFilter = 'AND MONTH(t.created_at) = ?';
        } else if (year) {
            dateFilter = 'AND YEAR(t.created_at) = ?';
        }

        if (company_id) {
            sourceQuery = `
          SELECT 
            discovered_at AS applied_source, 
            COUNT(*) as count
          FROM ats_applicants a
          JOIN ats_applicant_trackings t ON a.applicant_id = t.applicant_id
          WHERE t.company_id = ? ${dateFilter}
          GROUP BY discovered_at
          ORDER BY count DESC
        `;
            queryParams = [company_id];
            
            // Add date parameters if provided
            if (month && year) queryParams.push(parseInt(month), parseInt(year));
            else if (month) queryParams.push(parseInt(month));
            else if (year) queryParams.push(parseInt(year));
        } else {
            sourceQuery = `
          SELECT 
            discovered_at AS applied_source, 
            COUNT(*) as count
          FROM ats_applicants a
          JOIN ats_applicant_trackings t ON a.applicant_id = t.applicant_id
          WHERE 1=1 ${dateFilter}
          GROUP BY discovered_at
          ORDER BY count DESC
        `;
            
            if (month && year) queryParams = [parseInt(month), parseInt(year)];
            else if (month) queryParams = [parseInt(month)];
            else if (year) queryParams = [parseInt(year)];
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


exports.getApplicationSourceDistribution = async (req, res) => {
    try {
        const { company_id, month, year } = req.query;

        let applicationSourceQuery;
        let queryParams = [];
        let dateFilter = '';

        // Build date filter
        if (month && year) {
            dateFilter = 'AND MONTH(created_at) = ? AND YEAR(t.created_at) = ?';
        } else if (month) {
            dateFilter = 'AND MONTH(created_at) = ?';
        } else if (year) {
            dateFilter = 'AND YEAR(created_at) = ?';
        }

        if (company_id) {
            applicationSourceQuery = `
                SELECT applied_source, COUNT(*) as count
                FROM ats_applicant_trackings
                WHERE company_id = ? ${dateFilter}
                GROUP BY applied_source
                ORDER BY count DESC
            `
            queryParams = [company_id];
            
            if (month && year) queryParams.push(parseInt(month), parseInt(year));
            else if (month) queryParams.push(parseInt(month));
            else if (year) queryParams.push(parseInt(year));
        }
        else {
            applicationSourceQuery = `
                SELECT applied_source, COUNT(*) as count
                FROM ats_applicant_trackings
                WHERE 1=1 ${dateFilter}
                GROUP BY applied_source
                ORDER BY count DESC
            `
            if (month && year) queryParams.push(parseInt(month), parseInt(year));
            else if (month) queryParams.push(parseInt(month));
            else if (year) queryParams.push(parseInt(year));
        }

        const [ApplicationSourceDistribution] = await pool.execute(applicationSourceQuery, queryParams);

        res.status(200).json({
            success: true,
            data: ApplicationSourceDistribution
        });
    }
    catch (error) {
        console.error("Error fetching applicant source distribution:", error.message);
        res.status(500).json({ message: "Failed to fetch applicant source distribution" });
    }
}


/**
 * Get job position analytics with month/year filtering
 */
exports.getJobPositionAnalytics = async (req, res) => {
    try {
        const { company_id, month, year } = req.query;
        
        let jobPositionQuery;
        let queryParams = [];
        let dateFilter = '';
        
        // Build date filter condition
        if (month && year) {
            dateFilter = 'AND MONTH(t.created_at) = ? AND YEAR(t.created_at) = ?';
        } else if (month) {
            dateFilter = 'AND MONTH(t.created_at) = ?';
        } else if (year) {
            dateFilter = 'AND YEAR(t.created_at) = ?';
        }

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
        WHERE j.company_id = ? ${dateFilter}
        GROUP BY j.job_id, j.title
        ORDER BY applicant_count DESC
      `;
            queryParams = [company_id];
            
            // Add date parameters if provided
            if (month && year) queryParams.push(parseInt(month), parseInt(year));
            else if (month) queryParams.push(parseInt(month));
            else if (year) queryParams.push(parseInt(year));
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
        WHERE 1=1 ${dateFilter}
        GROUP BY j.job_id, j.title
        ORDER BY applicant_count DESC
      `;
            
            if (month && year) queryParams = [parseInt(month), parseInt(year)];
            else if (month) queryParams = [parseInt(month)];
            else if (year) queryParams = [parseInt(year)];
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
 * Get recent applicants with month/year filtering
 */
exports.getRecentApplicants = async (req, res) => {
    try {
        const { company_id, month, year, limit: limitParam } = req.query;
        // Default limit to 10 if not provided
        let limit = 10;
        let dateFilter = '';
        
        // Build date filter condition
        if (month && year) {
            dateFilter = 'AND MONTH(t.created_at) = ? AND YEAR(t.created_at) = ?';
        } else if (month) {
            dateFilter = 'AND MONTH(t.created_at) = ?';
        } else if (year) {
            dateFilter = 'AND YEAR(t.created_at) = ?';
        }

        // Only attempt to parse limit if it exists in the query
        if (limitParam) {
            limit = parseInt(limitParam, 10);
            // Ensure it's a positive number
            if (isNaN(limit) || limit <= 0) {
                limit = 10;
            }
        }

        let recentApplicantsQuery;
        let queryParams = [];

        if (company_id) {
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
          WHERE t.company_id = ? ${dateFilter}
          ORDER BY t.created_at DESC
          LIMIT ${limit}
        `;
            queryParams = [company_id];
            
            // Add date parameters if provided
            if (month && year) queryParams.push(parseInt(month), parseInt(year));
            else if (month) queryParams.push(parseInt(month));
            else if (year) queryParams.push(parseInt(year));
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
          WHERE 1=1 ${dateFilter}
          ORDER BY t.created_at DESC
          LIMIT ${limit}
        `;
            
            if (month && year) queryParams = [parseInt(month), parseInt(year)];
            else if (month) queryParams = [parseInt(month)];
            else if (year) queryParams = [parseInt(year)];
        }

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
 * Get interview schedule analytics with month/year filtering
 */
exports.getInterviewScheduleAnalytics = async (req, res) => {
    try {
        const { company_id, month, year } = req.query;
        const days = req.query.days ? parseInt(req.query.days) : 7;
        
        let interviewQuery;
        let queryParams = [];
        let dateFilter = '';
        
        // Build date filter for interviews
        if (month && year) {
            dateFilter = 'AND MONTH(i.date_of_interview) = ? AND YEAR(i.date_of_interview) = ?';
        } else if (month) {
            dateFilter = 'AND MONTH(i.date_of_interview) = ?';
        } else if (year) {
            dateFilter = 'AND YEAR(i.date_of_interview) = ?';
        }

        if (company_id) {
            interviewQuery = `
        SELECT 
          i.interview_id,
          i.date_of_interview,
          a.applicant_id,
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
        ${dateFilter}
        ORDER BY i.date_of_interview
      `;
            queryParams = [company_id, days];
            
            // Add date parameters if provided
            if (month && year) queryParams.push(parseInt(month), parseInt(year));
            else if (month) queryParams.push(parseInt(month));
            else if (year) queryParams.push(parseInt(year));
        } else {
            interviewQuery = `
        SELECT 
          i.interview_id,
          i.date_of_interview,
          a.applicant_id,
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
        ${dateFilter}
        ORDER BY i.date_of_interview
      `;
            queryParams = [days];
            
            if (month && year) queryParams.push(parseInt(month), parseInt(year));
            else if (month) queryParams.push(parseInt(month));
            else if (year) queryParams.push(parseInt(year));
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
 * Get hiring funnel metrics with added month/year filtering
 */
exports.getHiringFunnelMetrics = async (req, res) => {
    try {
        const { company_id, position_id, date_from, date_to, month, year } = req.query;

        let hiringFunnelQuery = `
            SELECT 
                COUNT(*) AS total_applications,
                SUM(CASE WHEN p.status = 'UNPROCESSED' THEN 1 ELSE 0 END) AS unprocessed,
                SUM(CASE WHEN p.status = 'PRE_SCREENING' THEN 1 ELSE 0 END) AS pre_screening,
                SUM(CASE WHEN p.status = 'TEST_SENT' THEN 1 ELSE 0 END) AS test_sent,
                SUM(CASE WHEN p.status = 'INTERVIEW_SCHEDULE_SENT' THEN 1 ELSE 0 END) AS interview_schedule_sent,
                SUM(CASE WHEN p.status = 'PHONE_INTERVIEW' THEN 1 ELSE 0 END) AS phone_interview,
                SUM(CASE WHEN p.status = 'FIRST_INTERVIEW' THEN 1 ELSE 0 END) AS first_interview,
                SUM(CASE WHEN p.status = 'SECOND_INTERVIEW' THEN 1 ELSE 0 END) AS second_interview,
                SUM(CASE WHEN p.status = 'THIRD_INTERVIEW' THEN 1 ELSE 0 END) AS third_interview,
                SUM(CASE WHEN p.status = 'FOURTH_INTERVIEW' THEN 1 ELSE 0 END) AS fourth_interview,
                SUM(CASE WHEN p.status = 'FOLLOW_UP_INTERVIEW' THEN 1 ELSE 0 END) AS follow_up_interview,
                SUM(CASE WHEN p.status = 'FINAL_INTERVIEW' THEN 1 ELSE 0 END) AS final_interview,
                SUM(CASE WHEN p.status = 'FOR_DECISION_MAKING' THEN 1 ELSE 0 END) AS for_decision_making,
                SUM(CASE WHEN p.status = 'FOR_JOB_OFFER' THEN 1 ELSE 0 END) AS for_job_offer,
                SUM(CASE WHEN p.status = 'JOB_OFFER_REJECTED' THEN 1 ELSE 0 END) AS job_offer_rejected,
                SUM(CASE WHEN p.status = 'JOB_OFFER_ACCEPTED' THEN 1 ELSE 0 END) AS job_offer_accepted,
                SUM(CASE WHEN p.status = 'FOR_FUTURE_POOLING' THEN 1 ELSE 0 END) AS for_future_pooling,
                SUM(CASE WHEN p.status = 'WITHDREW_APPLICATION' THEN 1 ELSE 0 END) AS withdrew_application,
                SUM(CASE WHEN p.status = 'BLACKLISTED' THEN 1 ELSE 0 END) AS blacklisted,
                SUM(CASE WHEN p.status = 'GHOSTED' THEN 1 ELSE 0 END) AS ghosted,
                SUM(CASE WHEN p.status = 'NOT_FIT' THEN 1 ELSE 0 END) AS not_fit
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

        // Alternative month/year filtering if date range not provided
        if (!date_from && !date_to) {
            if (month && year) {
                hiringFunnelQuery += " AND MONTH(t.created_at) = ? AND YEAR(t.created_at) = ?";
                queryParams.push(parseInt(month), parseInt(year));
            } else if (month) {
                hiringFunnelQuery += " AND MONTH(t.created_at) = ?";
                queryParams.push(parseInt(month));
            } else if (year) {
                hiringFunnelQuery += " AND YEAR(t.created_at) = ?";
                queryParams.push(parseInt(year));
            }
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
 * Get monthly applicant trends with month/year filtering
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

