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

// ── Startup checks ──
console.log('🔍 Checking environment variables...');
if (!process.env.SHEET_ID) {
  console.error('❌ SHEET_ID environment variable is missing!');
} else {
  console.log('✅ SHEET_ID found:', process.env.SHEET_ID);
}
if (!process.env.GOOGLE_CREDENTIALS) {
  console.error('❌ GOOGLE_CREDENTIALS environment variable is missing!');
} else {
  try {
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    console.log('✅ GOOGLE_CREDENTIALS parsed OK. client_email:', creds.client_email);
  } catch (e) {
    console.error('❌ GOOGLE_CREDENTIALS is not valid JSON:', e.message);
  }
}

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
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Sheet1!A:I',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowData] },
  });
  console.log('📊 Sheets API response:', JSON.stringify(response.data));
  return response;
}

// ── API ROUTES (must be before the catch-all) ──

// Health check
app.get('/api/test', (req, res) => {
  res.json({
    status: 'ok',
    sheet_id_set: !!process.env.SHEET_ID,
    credentials_set: !!process.env.GOOGLE_CREDENTIALS,
  });
});

// Debug: verify sheet is accessible
app.get('/api/debug-sheet', async (req, res) => {
  try {
    const sheets = getGoogleSheetsClient();
    const result = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SHEET_ID
    });
    res.json({
      found: true,
      sheet_id_used: process.env.SHEET_ID,
      title: result.data.properties.title,
      tabs: result.data.sheets.map(s => s.properties.title)
    });
  } catch (err) {
    res.json({
      found: false,
      sheet_id_used: process.env.SHEET_ID,
      error: err.message,
      status: err.response ? err.response.status : null
    });
  }
});

// POST /api/book-service
app.post('/api/book-service', async (req, res) => {
  try {
    console.log('📥 Incoming booking body:', JSON.stringify(req.body));

    const {
      service, fullName, company, email,
      phone, preferredDate, preferredTime, description
    } = req.body;

    const required = { service, fullName, company, email, phone, preferredDate, preferredTime, description };
    const missing = Object.entries(required).filter(([, v]) => !v || !v.toString().trim());
    if (missing.length) {
      console.warn('⚠️ Missing fields:', missing.map(([k]) => k));
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.map(([k]) => k).join(', ')}`
      });
    }

    const timestamp = new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' });
    const row = [timestamp, service, fullName, company, email, phone, preferredDate, preferredTime, description];

    console.log('📤 Appending row to sheet:', row);
    await appendToSheet(row);
    console.log(`✅ Booking saved: ${service} — ${fullName} (${email})`);

    res.json({ success: true, message: 'Booking saved successfully.' });
  } catch (err) {
    console.error('❌ Booking error name:', err.name);
    console.error('❌ Booking error message:', err.message);
    if (err.response) {
      console.error('❌ Google API error status:', err.response.status);
      console.error('❌ Google API error data:', JSON.stringify(err.response.data));
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Catch-all: serve frontend (MUST be last) ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Resilient Backend running at http://localhost:${PORT}\n`);
});