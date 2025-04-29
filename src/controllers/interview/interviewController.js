const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");
const applicantModel = require("../../models/applicant/applicantModel");
const interviewModel = require("../../models/interview/interviewModel");
const slack = require("../../services/slack");

// /interview - post
exports.addInterview = async (req, res) => {
    try {
        const interview = req.body;
        const interview_id = uuidv4();

        console.log(interview);


        let sql = `INSERT INTO ats_applicant_interviews (interview_id, tracking_id, interviewer_id, date_of_interview)
                     VALUES (?, ?, ?, ?)`;
        let values = [interview_id, interview.tracking_id, interview.interviewer_id, interview.date_of_interview];
        await pool.execute(sql, values);

        await slack.messageBotInterview(interview.interviewer_id, interview.applicant_id);

        res.status(201).json({ message: "interview added" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error });
    }
}

exports.getInterview = async (req, res) => {
    try {
        const tracking_id = req.query.tracking_id;
        console.log(tracking_id);

        if (!tracking_id) {
            return res.status(400).json({ message: "Missing tracking_id parameter" });
        }
        const results = await interviewModel.discussionAllInterview(tracking_id);

        // Ensure interview_notes is parsed as a JavaScript array
        const formattedResults = results.map(interview => ({
            ...interview,
            interview_notes: Array.isArray(interview.interview_notes)
                ? interview.interview_notes.filter(note => note !== null)  // Remove null values
                : JSON.parse(interview.interview_notes)
                    .filter(note => note !== null)  // Remove null values
                    .sort((a, b) => new Date(a.noted_at) - new Date(b.noted_at)) // Sort by noted_at
        }));
        res.status(200).json(formattedResults);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};


exports.editNote = async (req, res) => {
    try {
        const interview = req.body;

        const sql = `
            UPDATE ats_interviews_notes
            SET note_body = ?
            WHERE note_id = ?
        `;
        const values = [interview.note_body, interview.note_id];
        await pool.execute(sql, values);

        res.status(201).json({ message: "note edited" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error });
    }
}

exports.addNote = async (req, res) => {
    try {
        //we need the interview_id, note_type, and note_body
        const interview = req.body;
        const note_id = uuidv4();

        const sql = `
            INSERT INTO ats_interviews_notes (note_id, interview_id, note_type, note_body, user_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [note_id, interview.interview_id, interview.note_type, interview.note_body, interview.noted_by];

        await pool.execute(sql, values);

        await slack.messageBotNote(interview.slack_message, interview.interviewer_id, interview.applicant_id);

        res.status(201).json({ message: "interview note added" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error });
    }
}

exports.exportDiscussionInterview = async (req, res) => {
    try {
        const applicant_id = req.params.applicant_id
        const tracking_id = req.params.tracking_id;
        console.log('params', req.params);


        if (!tracking_id) {
            return res.status(400).json({ message: "Missing tracking_id parameter" });
        }

        const results = await interviewModel.discussionAllInterview(tracking_id);

        // Ensure interview_notes is parsed as a JavaScript array
        const formattedResults = results.map(interview => ({
            ...interview,
            interview_notes: Array.isArray(interview.interview_notes)
                ? interview.interview_notes.filter(note => note !== null)  // Remove null values
                : JSON.parse(interview.interview_notes)
                    .filter(note => note !== null)  // Remove null values
                    .sort((a, b) => new Date(a.noted_at) - new Date(b.noted_at)) // Sort by noted_at
        }));
        console.log(formattedResults);


        const applicant = await applicantModel.getApplicant(applicant_id);
        console.log(applicant);

        res.status(200).json({ formattedResults, applicant });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
}



