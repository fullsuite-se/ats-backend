const pool = require("../../config/db");


const getPositions = async () => {
        //return list of positions
        try {
            const sql = `
            SELECT * 
            FROM sl_company_jobs
        `;
    
        const [results] = await pool.execute(sql);
        return results; 
        } catch (error) {
            console.log(error.message);
            return [];
            
        }
}

module.exports = {getPositions};