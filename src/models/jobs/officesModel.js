const pool = require("../../config/db");

const CompanyOffice = {
  getAllOffices: async () => {
    const query = `
      SELECT 
        office_id AS officeId, 
        company_id AS companyId, 
        office_name AS officeName, 
        office_address AS officeAddress,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM company_offices
    `;
    const [rows] = await pool.query(query);
    return rows;
  },

  getOfficeById: async (officeId) => {
    const query = `
      SELECT 
        office_id AS officeId, 
        company_id AS companyId, 
        office_name AS officeName, 
        office_address AS officeAddress,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM company_offices
      WHERE office_id = ?
    `;
    const [rows] = await pool.query(query, [officeId]);
    return rows[0];
  },

  getOfficesByCompanyId: async (companyId) => {
    const query = `
      SELECT 
        office_id AS officeId, 
        company_id AS companyId, 
        office_name AS officeName, 
        office_address AS officeAddress,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM company_offices
      WHERE company_id = ?
    `;
    const [rows] = await pool.query(query, [companyId]);
    return rows;
  },

  createOffice: async (newOffice) => {
    const query = `INSERT INTO company_offices SET ?`;
    const [result] = await pool.query(query, [newOffice]);
    return result;
  },

  updateOffice: async (officeId, officeUpdates) => {
    const query = `UPDATE company_offices SET ? WHERE office_id = ?`;
    const [result] = await pool.query(query, [officeUpdates, officeId]);
    return result;
  },

  deleteOffice: async (officeId) => {
    const query = `DELETE FROM company_offices WHERE office_id = ?`;
    const [result] = await pool.query(query, [officeId]);
    return result;
  },

  deleteOfficesByCompanyId: async (companyId) => {
    const query = `DELETE FROM company_offices WHERE company_id = ?`;
    const [result] = await pool.query(query, [companyId]);
    return result;
  },

  getOfficeCountByCompanyId: async (companyId) => {
    const query = `
      SELECT COUNT(office_id) AS count 
      FROM company_offices 
      WHERE company_id = ?
    `;
    const [rows] = await pool.query(query, [companyId]);
    return rows[0];
  },
  
searchOffices: async (searchValue, companyId) => {
  const query = `
    SELECT 
      office_id AS officeId, 
      company_id AS companyId, 
      office_name AS officeName, 
      office_address AS officeAddress,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM company_offices
    WHERE (office_name LIKE ? OR office_address LIKE ?) AND company_id = ?
  `;
  const searchPattern = `%${searchValue}%`;
  const [rows] = await pool.query(query, [searchPattern, searchPattern, companyId]);
  return rows;
},

  getOfficeWithCompanyDetails: async (officeId) => {
    const query = `
      SELECT 
        co.office_id AS officeId, 
        co.company_id AS companyId, 
        co.office_name AS officeName, 
        co.office_address AS officeAddress,
        co.created_at AS createdAt,
        co.updated_at AS updatedAt,
        c.company_name AS companyName,
        c.company_email AS companyEmail
      FROM company_offices co
      JOIN companies c ON co.company_id = c.company_id
      WHERE co.office_id = ?
    `;
    const [rows] = await pool.query(query, [officeId]);
    return rows[0];
  }
};

module.exports = CompanyOffice;