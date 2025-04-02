const multer = require('multer');
const upload = multer();
require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const pool = require("../../config/db");
const emailController = require("../email/emailController");

const getBlackListedApplicants = async () => {
    const sql = `
                SELECT *
                FROM ats_applicants a
                LEFT JOIN ats_contact_infos c
                    ON a.applicant_id = c.applicant_id
                LEFT JOIN ats_applicant_trackings t
                    ON a.applicant_id = t.applicant_id
                LEFT JOIN ats_applicant_progress p
                    ON t.progress_id = p.progress_id
                WHERE p.status = 'BLACKLISTED';
    `;

    try {
        const [results, fields] = await pool.execute(sql);
        return results
    } catch (error) {
        console.error(error);
        return [];
    }
}

const checkInBlacklisted = (applicant, blackListedApplicants) => {
    let isBlacklisted = false; 
    blackListedApplicants.forEach(blacklisted => {

        if (
            applicant.first_name === blacklisted.first_name &&
            applicant.last_name === blacklisted.last_name && 
            applicant.email_1 === blacklisted.email_1 &&
            applicant.mobile_number_1 === blacklisted.mobile_number_1
        ) {
            isBlacklisted = true; 
            
        }
    });
    return isBlacklisted; 
}

exports.checkIfBlacklisted = async (req, res) => {
    try {
        const applicant = JSON.parse(req.body.applicant);
        const blackListedApplicants = await getBlackListedApplicants();

        const isBlacklisted = checkInBlacklisted(applicant, blackListedApplicants);

        
        if (isBlacklisted) {
            //email the applicant
            const email_body = `
            <p>
                Upon checking our system, you're blacklisted. You can apply once your blacklisted status is lifted. Thank you!
            </p>`;
            const email_subject = `Application to FullSuite has Failed`;

            emailController.emailApplicantGuest(applicant, email_subject, email_body);

            //return true
            return res.status(200).json({ isBlacklisted: isBlacklisted, message: "ok", emailMessage: email_body});
        }

        return res.status(200).json({ isBlacklisted: isBlacklisted, message: "ok" });
    } catch (error) {
        res.status(500).json({ message: error.message })

    }
}
