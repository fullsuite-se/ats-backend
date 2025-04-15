const { config } = require("dotenv");
const gdriveModel = require("../../models/userConfiguration/gdriveModel");
require("dotenv").config();

const COMPANY_ID = process.env.COMPANY_ID;

exports.addGdriveConfigurationCredentials = (req, res) => {
    try {
        let { company_id, config_json, gdrive_folder_id } = req.body;
        //gdriveModel.addGdriveConfigurationCredentials(company_id, config_json, gdrive_folder_id);
        //We'll past the default company_id of fullsuite for now. 
        gdriveModel.addGdriveConfigurationCredentials(COMPANY_ID, config_json, gdrive_folder_id);
        return res.status(201).json({ message: "successfully inserted" })
    } catch (error) {
        return res.status(501).json({ message: error.message })
    }
}

