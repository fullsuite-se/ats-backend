const pool = require("../../config/db");

exports.getApplicantCount = async (req, res) => {
    const positionFilter = req.query.position || "";

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
        acc[statusConfig[key].display] = 0; // Initialize display name counts
        acc[statusConfig[key].stage] = 0;   // Initialize stage counts
        return acc;
    }, {});

    const sql = `
        SELECT ats_applicant_trackings.tracking_id, ats_applicant_progress.stage, 
                ats_applicant_progress.status, sl_company_jobs.title
        FROM ats_applicant_trackings
        INNER JOIN ats_applicant_progress ON ats_applicant_trackings.progress_id = ats_applicant_progress.progress_id
        INNER JOIN sl_company_jobs ON ats_applicant_trackings.position_id = sl_company_jobs.job_id
    `;

    const [results] = await pool.execute(sql);

    results.forEach(data => {
        if (!positionFilter || positionFilter === "All" || data.title === positionFilter) {
            const status = data.status;
            if (statusConfig[status]) {
                const { display, stage } = statusConfig[status];
                counter[display] += 1;
                counter[stage] += 1;
            }
        }
    });

    res.json(counter);
};


exports.tryAPI = (req, res) => {
    const subject  = req.body
    console.log(subject)
    //console.log("subject is: " + subject)
    res.json({"message": "try"})
}