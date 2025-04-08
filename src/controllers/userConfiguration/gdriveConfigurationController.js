const gdriveModel = require("../../models/userConfiguration/gdriveModel"); 

exports.addGdriveConfigurationCredentials = (req, res) => {
    try {
        console.log('payload',req.body);
        
        let {company_id, config_json, gdrive_folder_id} = req.body; 
        // config_json = JSON.stringify(config_json); 
        gdriveModel.addGdriveConfigurationCredentials(company_id, config_json, gdrive_folder_id); 
        return res.status(201).json({message: "successfully inserted"})
    } catch (error) {
        return res.status(501).json({message: error.message})
    }
}

