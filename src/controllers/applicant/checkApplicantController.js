const multer = require('multer');
const upload = multer();
require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const pool = require("../../config/db");
const emailController = require("../email/emailController");
const applicantModel = require("../../models/applicant/applicantModel");

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
        const blackListedApplicants = await applicantModel.getBlackListedApplicants();

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
            return res.status(200).json({ isBlacklisted: isBlacklisted, message: "ok", emailMessage: email_body });
        }

        return res.status(200).json({ isBlacklisted: isBlacklisted, message: "ok" });
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// TODO check duplicates or existing application (application)
exports.checkExistingApplication = async (req, res) => {
    try {
        const applicant = JSON.parse(req.body.applicant);

        const result = await applicantModel.existingApplication(applicant);

        if (result.length > 0) {
            console.log('existing applicant', result);

            return res.status(200).json({ message: "existing application", isExisting: true, existingRecord: result });
        }
        return res.status(200).json({ message: "no duplicates detected", isExisting: false })
    } catch (error) {
        console.log(error.message);

        res.status(500).json({ message: error.message })
    }
}
