const pool = require("../../config/db");
const { v4: uuidv4 } = require('uuid');
const applicantModel = require("../../models/applicant/applicantModel");
const { errorMonitor } = require("nodemailer/lib/xoauth2");
const positionModel = require("../../models/position/positionModel");
const emailController = require("../email/emailController");
const addApplicantController = require("../applicant/addApplicantController");

const getPendingApplicant = async (pending_applicant_id) => {
    try {
        const sql = `
            SELECT * 
            FROM ats_pending_applicants
            WHERE pending_applicant_id = ?
        `;

        const values = [pending_applicant_id];
        const [results] = await pool.execute(sql, values);
        return results[0];
    } catch (error) {
        console.log(error.message);

        return {};
    }
}

const changePendingStatus = async (pending_applicant_id, status) => {
    const sql = `
        UPDATE ats_pending_applicants 
        SET status = ?
        WHERE pending_applicant_id = ?
    `;
    const values = [status, pending_applicant_id];
    await pool.execute(sql, values);
    return
}



exports.addApplicantToPending = async (req, res) => {
    try {
        if (!req.body.applicant) {
            return res.status(400).json({ message: "Applicant data is missing" });
        }

        const applicant = JSON.parse(req.body.applicant);
        const applicantStringify = JSON.stringify(applicant);
        const pending_applicant_id = uuidv4();
        const sql = `
            INSERT INTO ats_pending_applicants (pending_applicant_id, applicant)
            VALUES (?, ?); 
        `;
        const values = [pending_applicant_id, applicantStringify];
        await pool.execute(sql, values);
        return res.status(201).json({ message: "pending applicant successfully added" })
    } catch (error) {
        return res.status(500).json({ message: error.message });

    }
}

exports.getPendingApplicants = async (req, res) => {
    try {
        const positions = await positionModel.getPositions();


        const positionMap = {};
        for (const pos of positions) {
            positionMap[pos.job_id] = pos.title;
        }

        const sql = `
            SELECT * 
            FROM ats_pending_applicants 
            WHERE status = 1;
        `;
        const [results] = await pool.execute(sql);

        const updatedResults = results.map(applicantEntry => {
            const applicant = applicantEntry.applicant;
            const jobTitle = positionMap[applicant.position_id] || 'Unknown Position';
            return {
                ...applicantEntry,
                applicant: {
                    ...applicant,
                    title: jobTitle
                }
            };
        });

        return res.status(201).json({
            message: "successfully retrieved",
            pendingApplicants: updatedResults
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

//TODO email the applicant
exports.confirmPendingApplicant = async (req, res) => {
    try {
        const pending_applicant_id = req.body.pending_applicant_id;

        const pendingApplicant = await getPendingApplicant(pending_applicant_id);
        //extract only the applicant
        const applicant = pendingApplicant.applicant;

        const email_subject = `Your Job Application Has Been Accepted – Next Steps`;
        const email_body = `
            <p>Dear Applicant,</p>

            <p>We are pleased to inform you that your application has been <strong>accepted</strong> at Fullsuite.</p>

            <p>You may now proceed with the next steps in the process. Further instructions will be provided shortly. If you have any questions or need assistance, feel free to contact us.</p>

            <p>We look forward to working with you.</p>

            <p>Best regards,<br>
            Fullsuite Recruitment Team</p>
        `;

        await emailController.emailApplicantGuest(applicant, email_subject, email_body);

        //passing it to the add applicant controller
        req.body.applicant = JSON.stringify(applicant);
        addApplicantController.addApplicant(req, res);

        //change the status to 0 to reflect that it is not pending. 
        await changePendingStatus(pending_applicant_id, 0);

        //return res.status(201).json({ message: "successfully inserted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

exports.rejectPendingApplicant = async (req, res) => {
    try {
        const pending_applicant_id = req.body.pending_applicant_id;

        const pendingApplicant = await getPendingApplicant(pending_applicant_id);
        //extract only the applicant
        const applicant = pendingApplicant.applicant;

        await changePendingStatus(pending_applicant_id, 0);

        const email_subject = `Your Job Application Status`;
        const email_body = `
            <p>Dear Applicant,</p>

            <p>Thank you for taking the time to apply for the position at Fullsuite.</p>

            <p>After careful consideration, we regret to inform you that you have not been selected to move forward in the hiring process.</p>

            <p>We truly appreciate your interest in joining our team and encourage you to apply for future opportunities that match your skills and experience.</p>

            <p>We wish you all the best in your job search and future professional endeavors.</p>

            <p>Sincerely,<br>
            Fullsuite Recruitment Team</p>
        `;
        await emailController.emailApplicantGuest(applicant, email_subject, email_body);


        res.status(200).json({ message: "successfully rejected (changed the status to 0)" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}