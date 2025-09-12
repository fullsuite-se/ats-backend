const express = require('express');
const router = express.Router();
const calendarController = require('../../controllers/calendar/calendarController');

// Google Calendar OAuth2 flow
router.get('/', calendarController.authUrl);
router.get('/redirect', calendarController.oauthCallback);

// Calendar API endpoints
router.get('/calendars', calendarController.listCalendars);
router.get('/events', calendarController.listEvents);

module.exports = router;
