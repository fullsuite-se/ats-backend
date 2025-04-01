const pool = require("../../config/db");
const positionModel = require("../../models/position/positionModel");

exports.getPositions = async (req, res) => {
    //return list of positions
    try {
        const results = await positionModel.getPositions();
        res.status(200).json({ message: "positions retrieved", positions: results })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}