const { oauth2Client, SCOPES, google } = require("../../config/googleCalendarConfig");

exports.getAuthUrl = (req, res) => {
  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
    });
    res.json({ url });
  } catch (err) {
    console.error("Auth URL error:", err);
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
};

exports.oauthCallback = async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) throw new Error("No code provided");

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    res.cookie("tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: false, // ✅ set true in production
    });

    const frontend = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    res.redirect(`${frontend}/?auth=success`);
  } catch (err) {
    console.error("OAuth2 callback error:", err);
    res.status(500).send("Authentication failed");
  }
};

exports.logout = (req, res) => {
  try {
    res.clearCookie("tokens", { path: "/" });
    res.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ success: false });
  }
};

exports.getUserInfo = async (req, res) => {
  try {
    const oauth2 = google.oauth2({ auth: req.oauthClient, version: "v2" });
    const userinfo = await oauth2.userinfo.get();
    res.json({ authenticated: true, user: userinfo.data });
  } catch (err) {
    console.error("User info error:", err);
    res.json({ authenticated: false });
  }
};