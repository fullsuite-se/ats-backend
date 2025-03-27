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