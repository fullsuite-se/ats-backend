const pool = require("../../config/db");

const f_applicationsReceived = async (month, year, position_id) => {
    try {
        let whereClause = '';
        let params = [];

        if (month || year || position_id) {
            const conditions = [];

            if (month) {
                conditions.push('MONTH(t.created_at) = ?');
                params.push(parseInt(month));
            }
            if (year) {
                conditions.push('YEAR(t.created_at) = ?');
                params.push(parseInt(year));
            }
            if (position_id) {
                conditions.push('t.position_id = ?');
                params.push(position_id);
            }

            whereClause = "WHERE " + conditions.join(" AND ")
        }


        const totalQuery = `SELECT COUNT(*) AS count 
                            FROM ats_applicant_trackings t
                            ${whereClause}`;

        const [overall] = await pool.execute(totalQuery, params);
        return overall[0].count;
    } catch (error) {
        console.error(error);
        return null;
    }
};

const f_topJobs = async (month, year, position_id) => {
    try {
        let whereClause = '';
        let params = [];

        // Build dynamic WHERE conditions
        if (month || year || position_id) {
            const conditions = [];

            if (month) {
                conditions.push('MONTH(t.created_at) = ?');
                params.push(parseInt(month));
            }
            if (year) {
                conditions.push('YEAR(t.created_at) = ?');
                params.push(parseInt(year));
            }
            if (position_id) {
                conditions.push('t.position_id = ?');
                params.push(position_id);
            }

            whereClause = "WHERE " + conditions.join(" AND ");
        }

        // Get total number of applications received
        const applicationsReceived = await f_applicationsReceived(month, year, position_id);

        // If no applications, avoid division by zero
        if (!applicationsReceived || applicationsReceived === 0) {
            return { title: null, count: 0, total_applicant: 0, percentage: '0%' };
        }

        // Top jobs query - fix JOIN issue
        const applicationCountPerPosition = `
            SELECT j.title, COUNT(t.applicant_id) AS count
            FROM ats_applicant_trackings t
            JOIN sl_company_jobs j ON t.position_id = j.job_id
            ${whereClause}
            GROUP BY j.title
            ORDER BY count DESC
            LIMIT 1
        `;

        const [topJobs] = await pool.execute(applicationCountPerPosition, params);

        // If no top job found
        if (!topJobs || topJobs.length === 0) {
            return { title: null, count: 0, total_applicant: applicationsReceived, percentage: '0%' };
        }

        const topJob = topJobs[0];

        return {
            title: topJob.title,
            count: topJob.count,
            total_applicant: applicationsReceived,
            percentage: ((topJob.count / applicationsReceived) * 100).toFixed(2) + '%'
        };

    } catch (error) {
        console.error('Error fetching top jobs:', error);
        return null;
    }
};

//calculates the total hires (job offer accepted);
const f_totalHires = async (month, year, position_id) => {
    try {
        let whereClause = 'WHERE p.status = \'JOB_OFFER_ACCEPTED\'';
        let params = [];

        if (month || year || position_id) {
            const conditions = [];

            if (month) {
                conditions.push('MONTH(t.created_at) = ?');
                params.push(parseInt(month));
            }
            if (year) {
                conditions.push('YEAR(t.created_at) = ?');
                params.push(parseInt(year));
            }
            if (position_id) {
                conditions.push('t.position_id = ?');
                params.push(position_id);
            }

            whereClause = whereClause + " AND " + conditions.join(" AND ")
        }

        const totalHiresQuery = `
            SELECT COUNT(*) AS totalHires 
            FROM ats_applicant_trackings t 
            JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
            ${whereClause}`;

        const [[{ totalHires }]] = await pool.execute(totalHiresQuery, params);
        return totalHires;
    } catch (error) {
        console.error('Error fetching top jobs:', error);
        return null;
    }
}

const f_InternalExternalHires = async (month, year, position_id) => {
    try {
        let whereClause = 'WHERE p.status = \'JOB_OFFER_ACCEPTED\'';
        let params = [];

        if (month || year || position_id) {
            const conditions = [];

            if (month) {
                conditions.push('MONTH(t.created_at) = ?');
                params.push(parseInt(month));
            }
            if (year) {
                conditions.push('YEAR(t.created_at) = ?');
                params.push(parseInt(year));
            }
            if (position_id) {
                conditions.push('t.position_id = ?');
                params.push(position_id);
            }

            whereClause = whereClause + conditions.join(" AND ")
        }

        const totalHires = await f_totalHires(month, year, position_id);


        const internalQuery = `
            SELECT COUNT(*) AS internal_hires 
            FROM ats_applicant_trackings t 
            JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
            ${whereClause} 
            AND t.applied_source IN ('REFERRAL', 'INTERNSHIP')`;

        console.log(internalQuery);

        const [internal] = await pool.execute(internalQuery, params);

        const externalQuery = `
            SELECT COUNT(*) AS external_hires 
            FROM ats_applicant_trackings a 
            JOIN ats_applicant_progress p ON a.progress_id = p.progress_id
            ${whereClause} 
            AND a.applied_source NOT IN ('REFERRAL', 'INTERNSHIP')`;


        const [external] = await pool.execute(externalQuery, params);

        return {
            internal: internal[0].internal_hires,
            external: external[0].external_hires,
            internalRate: totalHires ? (internal[0].internal_hires / totalHires) * 100 : 0,
            externalRate: totalHires ? (external[0].external_hires / totalHires) * 100 : 0,

        };
    } catch (error) {
        console.error(error);
        return null;
    }
};

const f_dropOffRate = async (month, year, position_id) => {
    try {
        let whereClause = `WHERE p.status IN ( 'JOB_OFFER_REJECTED', 'WITHDREW_APPLICATION', 'GHOSTED', 'BLACKLISTED', 'NOT_FIT')`;
        let params = [];

        if (month || year || position_id) {
            const conditions = [];

            if (month) {
                conditions.push('MONTH(t.created_at) = ?');
                params.push(parseInt(month));
            }

            if (year) {
                conditions.push('YEAR(t.created_at) = ?');
                params.push(parseInt(year));
            }
            if (position_id) {
                conditions.push('t.position_id = ?');
                params.push(position_id);
            }

            whereClause = whereClause + " AND " + conditions.join(" AND ")
        }

        // Get drop-offs with filtering
        let sql = `
            SELECT COUNT(*) AS totalDropOffs 
            FROM ats_applicant_trackings t
            JOIN sl_company_jobs j ON t.position_id = j.job_id
            JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
            ${whereClause}
            `;

        const [[{ totalDropOffs }]] = await pool.execute(sql, params);

        const applicantReceived = await f_applicationsReceived(month, year, position_id);

        return totalHires > 0
            ? ((totalDropOffs / applicantReceived) * 100).toFixed(2) + '%'
            : '0.00%';


    } catch (error) {
        console.error('Error fetching drop-off rate:', error);
        return null;
    }
};

// analytic/metrics
const f_reasonForBlacklisted = async (month, year, position_id) => {
    try {
        const sql = `
            SELECT 
                p.reason AS blacklisted_reason,
                COUNT(p.reason) AS count,
                IFNULL(COUNT(p.reason) * 1.0 / (
                    SELECT COUNT(*) 
                    FROM ats_applicant_trackings t_sub 
                    JOIN ats_applicant_progress p_sub ON t_sub.progress_id = p_sub.progress_id
                    WHERE p_sub.reason IS NOT NULL
                    ${month ? ' AND MONTH(t_sub.created_at) = ?' : ''}
                    ${year ? ' AND YEAR(t_sub.created_at) = ?' : ''}
                    ${position_id ? ' AND t_sub.position_id = ?' : ''}
                ), 0) * 100 AS percentage
            FROM ats_applicant_trackings t 
            JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
            WHERE p.reason IS NOT NULL
            ${month ? ' AND MONTH(t.created_at) = ?' : ''}
            ${year ? ' AND YEAR(t.created_at) = ?' : ''}
            ${position_id ? ' AND t.position_id = ?' : ''}
            GROUP BY p.reason
        `;

        const queryParams = [
            ...(month ? [parseInt(month)] : []),
            ...(year ? [parseInt(year)] : []),
            ...(position_id ? [position_id] : []),
            ...(month ? [parseInt(month)] : []),
            ...(year ? [parseInt(year)] : []),
            ...(position_id ? [position_id] : [])
        ];

        const [results] = await pool.execute(sql, queryParams);

        return results.map(row => ({
            reason: row.blacklisted_reason,
            count: row.count,
            percentage: parseFloat(row.percentage).toFixed(2) + '%'
        }));
    } catch (error) {
        console.error('Error fetching blacklist reasons:', error);
        return null;
    }
};

// analytic/metrics
const f_reasonForRejection = async (month, year, position_id) => {
    try {
        const sql = `
            SELECT 
                p.reason_for_rejection,
                COUNT(p.reason_for_rejection) AS count,
                IFNULL(COUNT(p.reason_for_rejection) * 1.0 / (
                    SELECT COUNT(*) 
                    FROM ats_applicant_trackings t_sub 
                    JOIN ats_applicant_progress p_sub ON t_sub.progress_id = p_sub.progress_id
                    WHERE p_sub.reason_for_rejection IS NOT NULL
                    ${month ? ' AND MONTH(t_sub.created_at) = ?' : ''}
                    ${year ? ' AND YEAR(t_sub.created_at) = ?' : ''}
                    ${position_id ? ' AND t_sub.position_id = ?' : ''}
                ), 0) * 100 AS percentage
            FROM ats_applicant_trackings t 
            JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
            WHERE p.reason_for_rejection IS NOT NULL
            ${month ? ' AND MONTH(t.created_at) = ?' : ''}
            ${year ? ' AND YEAR(t.created_at) = ?' : ''}
            ${position_id ? ' AND t.position_id = ?' : ''}
            GROUP BY p.reason_for_rejection
        `;

        const queryParams = [
            ...(month ? [parseInt(month)] : []),
            ...(year ? [parseInt(year)] : []),
            ...(position_id ? [position_id] : []),
            ...(month ? [parseInt(month)] : []),
            ...(year ? [parseInt(year)] : []),
            ...(position_id ? [position_id] : [])
        ];

        const [results] = await pool.execute(sql, queryParams);

        return results.map(row => ({
            reason: row.reason_for_rejection,
            count: row.count,
            percentage: parseFloat(row.percentage).toFixed(2) + '%'
        }));
    } catch (error) {
        console.error('Error fetching blacklist reasons:', error);
        return null;
    }
};


module.exports = {
    f_applicationsReceived,
    f_topJobs,
    f_InternalExternalHires,
    f_dropOffRate,
    f_reasonForBlacklisted,
    f_reasonForRejection
}