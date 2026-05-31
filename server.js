const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;
const EXCEL_FILE = path.join(__dirname, 'service_bookings.xlsx');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend

// ── File upload setup ──
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// ── Excel helpers ──
function getOrCreateWorkbook() {
  if (fs.existsSync(EXCEL_FILE)) {
    return XLSX.readFile(EXCEL_FILE);
  }
  const wb = XLSX.utils.book_new();
  const headers = [[
    'Timestamp', 'Selected Service', 'Full Name', 'Company Name',
    'Email', 'Phone Number', 'Preferred Date', 'Preferred Time',
    'Requirement Description', 'Uploaded File'
  ]];
  const ws = XLSX.utils.aoa_to_sheet(headers);
  // Style header row widths
  ws['!cols'] = [
    { wch: 22 }, { wch: 40 }, { wch: 24 }, { wch: 30 },
    { wch: 30 }, { wch: 20 }, { wch: 16 }, { wch: 14 },
    { wch: 60 }, { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Resilient Service Bookings');
  return wb;
}

function appendToExcel(rowData) {
  const wb = getOrCreateWorkbook();
  const ws = wb.Sheets['Resilient Service Bookings'];
  // sheet_to_json with header:1 returns array-of-arrays (correct API)
  const existing = XLSX.utils.sheet_to_json(ws, { header: 1 });
  existing.push(rowData);
  const newWs = XLSX.utils.aoa_to_sheet(existing);
  newWs['!cols'] = [
    { wch: 22 }, { wch: 40 }, { wch: 24 }, { wch: 30 },
    { wch: 30 }, { wch: 20 }, { wch: 16 }, { wch: 14 },
    { wch: 60 }, { wch: 40 }
  ];
  wb.Sheets['Resilient Service Bookings'] = newWs;
  XLSX.writeFile(wb, EXCEL_FILE);
}

// ── Routes ──

// POST /api/book-service — handles JSON body or multipart form
app.post('/api/book-service', upload.single('document'), (req, res) => {
  try {
    const {
      service, fullName, company, email,
      phone, preferredDate, preferredTime, description
    } = req.body;

    // Validate required fields
    const required = { service, fullName, company, email, phone, preferredDate, preferredTime, description };
    const missing = Object.entries(required).filter(([, v]) => !v || !v.toString().trim());
    if (missing.length) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.map(([k]) => k).join(', ')}`
      });
    }

    const fileLink = req.file
      ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
      : '';

    const timestamp = new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' });

    const row = [
      timestamp, service, fullName, company,
      email, phone, preferredDate, preferredTime,
      description, fileLink
    ];

    appendToExcel(row);

    console.log(`[${timestamp}] New booking: ${service} — ${fullName} (${email})`);

    res.json({ success: true, message: 'Booking saved successfully.' });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// GET /api/bookings — view all bookings (protect this in production!)
app.get('/api/bookings', (req, res) => {
  try {
    if (!fs.existsSync(EXCEL_FILE)) {
      return res.json({ success: true, data: [], total: 0 });
    }
    const wb = XLSX.readFile(EXCEL_FILE);
    const ws = wb.Sheets['Resilient Service Bookings'];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const [headers, ...data] = rows;
    res.json({ success: true, headers, data, total: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// Catch-all: serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Resilient Backend running at http://localhost:${PORT}`);
  console.log(`📊 Bookings saved to: ${EXCEL_FILE}`);
  console.log(`📁 File uploads in: ${UPLOADS_DIR}\n`);
});