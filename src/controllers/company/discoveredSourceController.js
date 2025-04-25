const pool = require("../../config/db");

exports.getAllDiscoveredSource = async (req, res) => {
  const sql =
    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=?  AND TABLE_NAME=? AND COLUMN_NAME=?";
  const values = ["db_kriyahr", "ats_applicants", "discovered_at"];
  const [results] = await pool.execute(sql, values);
  const enumValuesMatch = results[0].COLUMN_TYPE.match(/enum\((.*?)\)/);
  if (enumValuesMatch) {
    const enumValues = enumValuesMatch[1]
      .split(",")
      .map((value) => value.trim().replace(/'/g, ""))
      .filter((value) => value);
    //console.log(enumValues);
    res.json(enumValues);
  } else {
    //console.log('No ENUM values found');
    res.json([]);
  }
};
