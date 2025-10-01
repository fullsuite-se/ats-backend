const { oauth2Client } = require("../config/googleCalendarConfig");

// ✅ Helper: set OAuth credentials from cookies

function setCredentialsFromCookies(req, res, next) {
  const cookie = req.cookies.tokens;

  console.log("Cookie:", req.cookies);

  console.log("Cookie:", JSON.stringify(req.cookies));


  if (!cookie) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const tokens = JSON.parse(cookie);
    oauth2Client.setCredentials(tokens);
    req.oauthClient = oauth2Client;
    next();
  } catch (err) {
    console.error("Auth cookie error:", err);
    res.status(401).json({ error: "Invalid tokens" });
  }
}

module.exports = { setCredentialsFromCookies };