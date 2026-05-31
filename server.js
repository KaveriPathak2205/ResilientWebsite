const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
 
const app = express();
const PORT = process.env.PORT || 3001;
 
// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
 
// ── Google Sheets Auth ──
function getGoogleSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}
 
// ── Append row to Google Sheet ──
async function appendToSheet(rowData) {
  const sheets = getGoogleSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Sheet1!A:I',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowData] },
  });
}
 
// ── POST /api/book-service ──
app.post('/api/book-service', async (req, res) => {
  try {
    console.log('Incoming booking body:', req.body);
 
    const {
      service, fullName, company, email,
      phone, preferredDate, preferredTime, description
    } = req.body;
 
    const required = { service, fullName, company, email, phone, preferredDate, preferredTime, description };
    const missing = Object.entries(required).filter(([, v]) => !v || !v.toString().trim());
    if (missing.length) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.map(([k]) => k).join(', ')}`
      });
    }
 
    const timestamp = new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' });
 
    const row = [
      timestamp, service, fullName, company,
      email, phone, preferredDate, preferredTime, description
    ];
 
    await appendToSheet(row);
 
    console.log(`✅ [${timestamp}] Booking saved: ${service} — ${fullName} (${email})`);
 
    res.json({ success: true, message: 'Booking saved successfully.' });
  } catch (err) {
    console.error('Booking error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error: ' + err.message });
  }
});
 
// Catch-all: serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
 
app.listen(PORT, () => {
  console.log(`\n🚀 Resilient Backend running at http://localhost:${PORT}`);
  console.log(`📊 Saving bookings to Google Sheet ID: ${process.env.SHEET_ID}\n`);
});
