const smtpModel = require("../../models/userConfiguration/smtpModel");

exports.addSmtpCredentials = (req, res) => {
    try {
        const {user_id, app_pass} = req.body; 
        
        smtpModel.addSmtpCredentials(user_id, app_pass)
        res.status(200).json({ message: 'smtp credentials added' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Add this function to get SMTP credentials
exports.getSmtpCredentials = async (req, res) => {
    try {
        const { user_id } = req.params;
        const credentials = await smtpModel.getSmtpCredentials(user_id);
        if (credentials) {
            res.status(200).json(credentials);
        } else {
            res.status(404).json({ message: 'SMTP credentials not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}