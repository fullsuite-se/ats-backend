const smtpModel = require("../../models/userConfiguration/smtpModel");

exports.addSmtpCredentials = (req, res) => {
    try {
        const data = req.body; 
        console.log(data);
        
        smtpModel.addSmtpCredentials()
        res.status(200).json({ message: 'smtp credentials added' })
    } catch (error) {
        res.status(500).json({ message: error.message })

    }

}