const { google } = require('googleapis');
const pool = require('../../config/db');

const Oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID_GOOGLE,
  process.env.SECRET_ID_GOOGLE,
  process.env.REDIRECT_URI_GOOGLE
);

// Helper function to store tokens in database
async function storeTokens(userId, tokens) {
  try {
    const { access_token, refresh_token, expiry_date, scope, token_type } = tokens;
    
    // Check if tokens already exist for this user
    const [existing] = await pool.execute(
      'SELECT id FROM google_oauth_tokens WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      // Update existing tokens
      await pool.execute(
        `UPDATE google_oauth_tokens 
         SET access_token = ?, refresh_token = ?, expiry_date = ?, scope = ?, token_type = ?, updated_at = NOW()
         WHERE user_id = ?`,
        [access_token, refresh_token, expiry_date, scope, token_type, userId]
      );
    } else {
      // Insert new tokens
      await pool.execute(
        `INSERT INTO google_oauth_tokens (user_id, access_token, refresh_token, expiry_date, scope, token_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, access_token, refresh_token, expiry_date, scope, token_type]
      );
    }
    
    console.log('Tokens stored successfully for user:', userId);
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw error;
  }
}

// Helper function to retrieve tokens from database
async function getTokens(userId) {
  try {
    const [rows] = await pool.execute(
      'SELECT access_token, refresh_token, expiry_date, scope, token_type FROM google_oauth_tokens WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return null;
    }

    const tokens = rows[0];
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      token_type: tokens.token_type
    };
  } catch (error) {
    console.error('Error retrieving tokens:', error);
    throw error;
  }
}

// 🔹 Step 1: Generate Google Auth URL
exports.authUrl = (req, res) => {
  const url = Oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    // Include state parameter to identify user after callback
    state: req.query.userId || 'default' // You should pass userId in the request
  });
  res.redirect(url);
};

// 🔹 Step 2: Handle OAuth2 Callback and store tokens
exports.oauthCallback = async (req, res) => {
  try {
    const code = req.query.code;
    const userId = req.query.state || 'default'; // Get userId from state parameter

    const { tokens } = await Oauth2Client.getToken(code);
    
    // Store tokens in database
    await storeTokens(userId, tokens);
    
    Oauth2Client.setCredentials(tokens);
    res.send('Successfully logged in to Google Calendar and tokens stored');
  } catch (err) {
    console.error("Couldn't get token or store tokens", err);
    return res.status(400).send('Error retrieving or storing tokens');
  }
};

// 🔹 Step 3: List Calendars (with token retrieval)
exports.listCalendars = async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    
    // Retrieve tokens from database
    const tokens = await getTokens(userId);
    if (!tokens) {
      return res.status(401).json({ error: 'No tokens found for user. Please authenticate first.' });
    }

    // Set credentials from database
    Oauth2Client.setCredentials(tokens);
    
    const calendar = google.calendar({ version: 'v3', auth: Oauth2Client });
    const apiResponse = await calendar.calendarList.list({});
    res.json(apiResponse.data.items || []);
  } catch (err) {
    console.error('Error listing calendars:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// 🔹 Step 4: List Events from a Calendar (with token retrieval)
exports.listEvents = async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const calendarId = req.query.calendar ?? 'primary';
    
    // Retrieve tokens from database
    const tokens = await getTokens(userId);
    if (!tokens) {
      return res.status(401).json({ error: 'No tokens found for user. Please authenticate first.' });
    }

    // Set credentials from database
    Oauth2Client.setCredentials(tokens);
    
    const calendar = google.calendar({ version: 'v3', auth: Oauth2Client });

    const response = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 15,
      singleEvents: true,
      orderBy: 'startTime'
    });

    res.json(response.data.items || []);
  } catch (err) {
    console.error('Error listing events:', err.message);
    res.status(500).json({ error: err.message });
  }
};