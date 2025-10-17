const pool = require("../../config/db");
const applicantModel = require("../../models/applicant/applicantModel");

exports.getApplicantCount = async (req, res) => {
    let positionFilter = req.query.position || "";
    positionFilter = positionFilter.trim(); // Trim the input
    
    console.log('Counter endpoint called with position:', JSON.stringify(positionFilter));

    // Combined mapping for statuses and stages
    const statusConfig = {
        "UNPROCESSED": { display: "Unprocessed", stage: "Pre-Screening Stage" },
        "PRE_SCREENING": { display: "Pre-Screening", stage: "Pre-Screening Stage" },
        "TEST_SENT": { display: "Test Sent", stage: "Pre-Screening Stage" },
        "INTERVIEW_SCHEDULE_SENT": { display: "Interview Schedule Sent", stage: "Interview Schedule Stage" },
        "PHONE_INTERVIEW": { display: "Phone Interview Stage", stage: "Interview Schedule Stage" },
        "FIRST_INTERVIEW": { display: "First Interview Stage", stage: "Interview Schedule Stage" },
        "SECOND_INTERVIEW": { display: "Second Interview Stage", stage: "Interview Schedule Stage" },
        "THIRD_INTERVIEW": { display: "Third Interview Stage", stage: "Interview Schedule Stage" },
        "FOURTH_INTERVIEW": { display: "Fourth Interview Stage", stage: "Interview Schedule Stage" },
        "FOLLOW_UP_INTERVIEW": { display: "Follow-up Interview Stage", stage: "Interview Schedule Stage" },
        "FINAL_INTERVIEW": { display: "Final Interview Stage", stage: "Interview Schedule Stage" },
        "FOR_DECISION_MAKING": { display: "For Decision Making", stage: "Job Offer Stage" },
        "FOR_JOB_OFFER": { display: "For Job Offer", stage: "Job Offer Stage" },
        "JOB_OFFER_REJECTED": { display: "Job Offer Rejected", stage: "Job Offer Stage" },
        "JOB_OFFER_ACCEPTED": { display: "Job Offer Accepted", stage: "Job Offer Stage" },
        "FOR_FUTURE_POOLING": { display: "For Future Pooling", stage: "Job Offer Stage" },
        "WITHDREW_APPLICATION": { display: "Withdrew Application", stage: "Unsuccessful Stage/Pool" },
        "GHOSTED": { display: "Ghosted", stage: "Unsuccessful Stage/Pool" },
        "BLACKLISTED": { display: "Blacklisted/Short-banned", stage: "Unsuccessful Stage/Pool" },
        "NOT_FIT": { display: "Not Fit", stage: "Unsuccessful Stage/Pool" }
    };

    // Initialize the counter object
    const counter = Object.keys(statusConfig).reduce((acc, key) => {
        acc[statusConfig[key].display] = 0;
        acc[statusConfig[key].stage] = 0;
        return acc;
    }, {});

    try {
        // Build SQL query with proper filtering
        let sql = `
            SELECT ats_applicant_trackings.tracking_id, ats_applicant_progress.stage, 
                    ats_applicant_progress.status, sl_company_jobs.title
            FROM ats_applicant_trackings
            INNER JOIN ats_applicant_progress ON ats_applicant_trackings.progress_id = ats_applicant_progress.progress_id
            INNER JOIN sl_company_jobs ON ats_applicant_trackings.position_id = sl_company_jobs.job_id
        `;
        
        const conditions = [];
        const values = [];

        if (positionFilter && positionFilter !== "All") {
            conditions.push("sl_company_jobs.title = ?");
            values.push(positionFilter);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ${conditions.join(" AND ")}`;
        }

        console.log('Executing SQL:', sql);
        console.log('With values:', values);

        const [results] = await pool.execute(sql, values);
        
        console.log(`Found ${results.length} applicants for counter`);

        results.forEach(data => {
            const status = data.status;
            if (statusConfig[status]) {
                const { display, stage } = statusConfig[status];
                counter[display] += 1;
                counter[stage] += 1;
            }
        });

        console.log('Final counter result:', counter);
        res.json(counter);
        
    } catch (error) {
        console.error('Error in getApplicantCount:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getFirstTimeJobSeekerCount = async (req, res) => {
    let positionFilter = req.query.position || "";
    positionFilter = positionFilter.trim();
    
    console.log('First-time job seeker counter endpoint called with position:', JSON.stringify(positionFilter));

    // Combined mapping for statuses and stages
    const statusConfig = {
        "UNPROCESSED": { display: "Unprocessed", stage: "Pre-Screening Stage" },
        "PRE_SCREENING": { display: "Pre-Screening", stage: "Pre-Screening Stage" },
        "TEST_SENT": { display: "Test Sent", stage: "Pre-Screening Stage" },
        "INTERVIEW_SCHEDULE_SENT": { display: "Interview Schedule Sent", stage: "Interview Schedule Stage" },
        "PHONE_INTERVIEW": { display: "Phone Interview Stage", stage: "Interview Schedule Stage" },
        "FIRST_INTERVIEW": { display: "First Interview Stage", stage: "Interview Schedule Stage" },
        "SECOND_INTERVIEW": { display: "Second Interview Stage", stage: "Interview Schedule Stage" },
        "THIRD_INTERVIEW": { display: "Third Interview Stage", stage: "Interview Schedule Stage" },
        "FOURTH_INTERVIEW": { display: "Fourth Interview Stage", stage: "Interview Schedule Stage" },
        "FOLLOW_UP_INTERVIEW": { display: "Follow-up Interview Stage", stage: "Interview Schedule Stage" },
        "FINAL_INTERVIEW": { display: "Final Interview Stage", stage: "Interview Schedule Stage" },
        "FOR_DECISION_MAKING": { display: "For Decision Making", stage: "Job Offer Stage" },
        "FOR_JOB_OFFER": { display: "For Job Offer", stage: "Job Offer Stage" },
        "JOB_OFFER_REJECTED": { display: "Job Offer Rejected", stage: "Job Offer Stage" },
        "JOB_OFFER_ACCEPTED": { display: "Job Offer Accepted", stage: "Job Offer Stage" },
        "FOR_FUTURE_POOLING": { display: "For Future Pooling", stage: "Job Offer Stage" },
        "WITHDREW_APPLICATION": { display: "Withdrew Application", stage: "Unsuccessful Stage/Pool" },
        "GHOSTED": { display: "Ghosted", stage: "Unsuccessful Stage/Pool" },
        "BLACKLISTED": { display: "Blacklisted/Short-banned", stage: "Unsuccessful Stage/Pool" },
        "NOT_FIT": { display: "Not Fit", stage: "Unsuccessful Stage/Pool" }
    };

    // Initialize the counter object
    const counter = Object.keys(statusConfig).reduce((acc, key) => {
        acc[statusConfig[key].display] = 0;
        acc[statusConfig[key].stage] = 0;
        return acc;
    }, {});

    try {
        // Build SQL query specifically for first-time job seekers
        let sql = `
            SELECT 
                ats_applicant_trackings.tracking_id, 
                ats_applicant_progress.stage, 
                ats_applicant_progress.status, 
                sl_company_jobs.title,
                ats_applicants.is_first_job
            FROM ats_applicant_trackings
            INNER JOIN ats_applicant_progress ON ats_applicant_trackings.progress_id = ats_applicant_progress.progress_id
            INNER JOIN sl_company_jobs ON ats_applicant_trackings.position_id = sl_company_jobs.job_id
            INNER JOIN ats_applicants ON ats_applicant_trackings.applicant_id = ats_applicants.applicant_id
            WHERE ats_applicants.is_first_job = TRUE
        `;
        
        const conditions = [];
        const values = [];

        if (positionFilter && positionFilter !== "All") {
            conditions.push("sl_company_jobs.title = ?");
            values.push(positionFilter);
        }

        if (conditions.length > 0) {
            sql += ` AND ${conditions.join(" AND ")}`;
        }

        console.log('Executing first-time job seeker SQL:', sql);
        console.log('With values:', values);

        const [results] = await pool.execute(sql, values);
        
        console.log(`Found ${results.length} first-time job seekers for counter`);

        results.forEach(data => {
            const status = data.status;
            if (statusConfig[status]) {
                const { display, stage } = statusConfig[status];
                counter[display] += 1;
                counter[stage] += 1;
            }
        });

        // Add total count of first-time job seekers
        counter.totalFirstTimeJobSeekers = results.length;

        console.log('Final first-time job seeker counter result:', counter);
        res.json(counter);
        
    } catch (error) {
        console.error('Error in getFirstTimeJobSeekerCount:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.tryAPI = (req, res) => {
    const subject = req.body;
    console.log(subject);
    res.json({"message": "try"});
};

// Add this debug endpoint
exports.debugPositions = async (req, res) => {
    try {
        const sql = `
            SELECT DISTINCT title, LENGTH(title) as length, job_id
            FROM sl_company_jobs 
            WHERE is_shown = 1
            ORDER BY title
        `;
        const [results] = await pool.execute(sql);
        
        // Check for positions with spaces
        const positionsWithSpaces = results.filter(pos => 
            pos.title !== pos.title.trim() || 
            pos.title.includes('  ')
        );
        
        res.json({
            allPositions: results,
            positionsWithSpaces: positionsWithSpaces,
            message: positionsWithSpaces.length > 0 ? 
                'Found positions with extra spaces' : 
                'All positions are clean'
        });
    } catch (error) {
        console.error('Error in debugPositions:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};