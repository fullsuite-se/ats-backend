const pool = require("../../config/db");


const f_applicationsReceived = async () => {
    try {
        const [overall] = await pool.execute(
            `SELECT COUNT(*) AS total_applications FROM ats_applicant_trackings`
        );

        const [breakdown] = await pool.execute(
            `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count 
            FROM ats_applicant_trackings 
            WHERE created_at >= (
                SELECT MAX(created_at) FROM ats_applicant_trackings
            ) - INTERVAL 3 MONTH
            GROUP BY month 
            ORDER BY month DESC`
        );

        const [allCountPerMonth] = await pool.execute(
            `SELECT DATE_FORMAT(created_at, '%m') AS month, COUNT(*) AS count 
            FROM ats_applicant_trackings 
            GROUP BY month 
            ORDER BY month DESC`
        );

        return { total: overall[0].total_applications, breakdown: breakdown, allCountPerMonth: allCountPerMonth };
    } catch (error) {
        console.error(error);
        return null;
    }
};

const f_topJobs = async () => {
    try {
        // Get total number of hires
        const [[{ totalHires }]] = await pool.execute(
            `
                SELECT COUNT(*) AS totalHires
                FROM ats_applicant_trackings a
                JOIN sl_company_jobs j ON a.position_id = j.job_id
                JOIN ats_applicant_progress p ON a.progress_id = p.progress_id
                WHERE p.status = 'JOB_OFFER_ACCEPTED'
            `
        );


        const [topJobs] = await pool.execute(
            `SELECT j.title, COUNT(a.applicant_id) AS hires
            FROM ats_applicant_trackings a
            JOIN sl_company_jobs j ON a.position_id = j.job_id
            JOIN ats_applicant_progress p ON a.progress_id = p.progress_id
            WHERE p.status = 'JOB_OFFER_ACCEPTED'
            GROUP BY j.title
            ORDER BY hires DESC
            LIMIT 4`
        );

        const [allJobs] = await pool.execute(
            `SELECT j.title, COUNT(a.applicant_id) AS hires
            FROM ats_applicant_trackings a
            JOIN sl_company_jobs j ON a.position_id = j.job_id
            JOIN ats_applicant_progress p ON a.progress_id = p.progress_id
            WHERE p.status = 'JOB_OFFER_ACCEPTED'
            GROUP BY j.title
            ORDER BY hires DESC
            `
        );


        const formattedTopJobs = topJobs.map(job => ({
            title: job.title,
            hires: job.hires,
            percentage: totalHires
                ? ((job.hires / totalHires) * 100).toFixed(2) + '%'
                : '0%'
        }));

        const formattedAllJobs = allJobs.map(job => ({
            title: job.title,
            hires: job.hires,
            percentage: totalHires
                ? ((job.hires / totalHires) * 100).toFixed(2) + '%'
                : '0%'
        }));

        return { formattedTopJobs: formattedTopJobs, formattedAllJobs: formattedAllJobs };
        // return { totalHires: totalHires, formattedTopJobs: topJobs, formattedAllJobs: allJobs };

    } catch (error) {
        console.error('Error fetching top jobs:', error);
        return null;
    }
};

const f_InternalExternalHires = async () => {
    try {
        const [internal] = await pool.execute(
            `SELECT COUNT(*) AS internal_hires 
            FROM ats_applicant_trackings a 
            JOIN ats_applicant_progress p ON a.progress_id = p.progress_id
            WHERE p.status = 'JOB_OFFER_ACCEPTED' 
            AND a.applied_source IN ('REFERRAL', 'WALK_IN')`
        );

        const [external] = await pool.execute(
            `SELECT COUNT(*) AS external_hires 
            FROM ats_applicant_trackings a 
            JOIN ats_applicant_progress p ON a.progress_id = p.progress_id
            WHERE p.status = 'JOB_OFFER_ACCEPTED' 
            AND a.applied_source IN ('LINKEDIN', 'SOCIAL_MEDIA', 'SUITELIFE')`
        );

        return {
            internal: internal[0].internal_hires,
            external: external[0].external_hires
        };
    } catch (error) {
        console.error(error);
        return null;
    }
};


const f_dropOffRate = async () => {
    try {
        // Get total number of applicants
        const [[{ totalApplicants }]] = await pool.execute(
            `SELECT COUNT(*) AS totalApplicants FROM ats_applicant_trackings`
        );

        // Get total drop-offs
        const [[{ totalDropOffs }]] = await pool.execute(
            `SELECT COUNT(*) AS totalDropOffs 
            FROM ats_applicant_progress 
            WHERE status IN ('WITHDREW_APPLICATION', 'BLACKLISTED', 'NOT_FIT')`
        );

        // Calculate overall drop-off rate
        const overallDropOffRate = totalApplicants
            ? ((totalDropOffs / totalApplicants) * 100).toFixed(2) + '%'
            : '0%';

        // Get drop-off rate for the last 3 months
        const [monthlyDropOffs] = await pool.execute(
            `SELECT DATE_FORMAT(updated_at, '%Y-%m') AS month, COUNT(*) AS count
            FROM ats_applicant_progress 
            WHERE status IN ('WITHDREW_APPLICATION', 'BLACKLISTED', 'NOT_FIT')
            AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
            GROUP BY month
            ORDER BY month DESC`
        );

        return {
            overallDropOffRate,
            monthlyDropOffs: monthlyDropOffs.map(row => ({
                month: row.month,
                dropOffRate: ((row.count / totalApplicants) * 100).toFixed(2) + '%'
            }))
        };

    } catch (error) {
        console.error('Error fetching drop-off rate:', error);
        return null;
    }
};

exports.getMetrics = async (req, res) => {
    try {
        const applicationsReceived = await f_applicationsReceived();
        const topJobs = await f_topJobs();
        const internalExternalHires = await f_InternalExternalHires();
        const dropOffRate = await f_dropOffRate();

        res.json({
            applicationsReceived,
            topJobs,
            internalExternalHires,
            dropOffRate
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


// endpoint for getting the count of applicant from FS website
exports.getFSApplicationCount = async (req, res) => {
    try {
        const sql = `
            SELECT COUNT(*) as fs_count
            FROM ats_applicant_trackings
            WHERE applied_source = 'Suitelife'
        `;

        const [result] = await pool.execute(sql);
        const count = result[0].fs_count;
        res.status(200).json({ message: "okay", fs_count: count });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
}