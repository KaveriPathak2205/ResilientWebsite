const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

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

// POST /api/contact  — sends an email to Utpal
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Please fill in all fields.' });
    }

    // ── Namecheap Private Email SMTP ──
    // Set these two env variables on Railway:
    //   SMTP_USER  — info@resilient-enterprise.com
    //   SMTP_PASS  — mailbox password for that address
    const transporter = nodemailer.createTransport({
      host: 'mail.privateemail.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Resilient Website" <${process.env.SMTP_USER}>`,
      to: 'utpal.pathak@zohomail.com',
      replyTo: email,
      subject: `New Contact Message from ${name}`,
      text: `Hello Utpal,\n\nYou have received a new message via the Resilient website contact form.\n\nFrom: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\n---\nYou can reply directly to this email to respond to ${name}.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0d4c0;border-radius:10px;overflow:hidden;">
          <div style="background:#b36b2c;padding:24px 28px;">
            <h2 style="color:#fff;margin:0;font-size:1.3rem;">New Contact Message — Resilient Website</h2>
          </div>
          <div style="padding:28px;background:#fffdf8;">
            <p style="margin:0 0 18px;color:#3a2e1e;font-size:1rem;">Hello Utpal,</p>
            <p style="margin:0 0 24px;color:#3a2e1e;">You have received a new message via the Resilient website contact form.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              <tr>
                <td style="padding:10px 14px;background:#f5ede0;border-radius:6px 6px 0 0;font-weight:bold;color:#7a4a1e;width:100px;">From</td>
                <td style="padding:10px 14px;background:#f5ede0;border-radius:6px 6px 0 0;color:#2f261b;">${name}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;background:#fdf6ee;font-weight:bold;color:#7a4a1e;">Email</td>
                <td style="padding:10px 14px;background:#fdf6ee;color:#2f261b;"><a href="mailto:${email}" style="color:#b36b2c;">${email}</a></td>
              </tr>
            </table>
            <div style="background:#f5ede0;border-left:4px solid #b36b2c;padding:16px 18px;border-radius:0 6px 6px 0;margin-bottom:24px;">
              <p style="margin:0 0 8px;font-weight:bold;color:#7a4a1e;">Message:</p>
              <p style="margin:0;color:#2f261b;white-space:pre-wrap;">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
            </div>
            <p style="margin:0;color:#888;font-size:0.85rem;">You can reply directly to this email to respond to ${name}.</p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Contact email sent from ${name} (${email})`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Contact email error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send message. Please try again.' });
  }
});

// ── Catch-all: serve frontend (MUST be last) ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Resilient Backend running at http://localhost:${PORT}\n`);
});
