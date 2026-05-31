# Resilient — Industrial Automation Services Website

A complete, professional dark-themed website for **Resilient Enterprise FZE LLC** — an industrial automation consultancy based in Dubai, UAE.

---

## 🗂️ Project Structure

```
resilient/
├── index.html          ← Complete frontend (single file, no build required)
├── server.js           ← Express.js backend API
├── package.json        ← Node.js dependencies
├── public/             ← (Create this folder and place index.html inside)
├── uploads/            ← Auto-created on first run (uploaded files)
└── service_bookings.xlsx  ← Auto-created on first booking submission
```

---

## ⚡ Quick Start (5 minutes)

### Step 1 — Install Node.js dependencies

```bash
cd resilient
npm install
```

### Step 2 — Set up the public folder

```bash
mkdir public
cp index.html public/index.html
```

### Step 3 — Run the backend

```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server starts at **http://localhost:3001**

### Step 4 — Open the website

Visit: **http://localhost:3001**

That's it! The frontend is served by the backend at the same URL.

---

## 📊 Excel / Bookings

Every time a user submits the booking form, the data is automatically appended to:

```
service_bookings.xlsx
```

**Sheet name:** `Resilient Service Bookings`

**Columns:**
| # | Column |
|---|--------|
| 1 | Timestamp |
| 2 | Selected Service |
| 3 | Full Name |
| 4 | Company Name |
| 5 | Email |
| 6 | Phone Number |
| 7 | Preferred Date |
| 8 | Preferred Time |
| 9 | Requirement Description |
| 10 | Uploaded File (link) |

**View all bookings via API:**
```
GET http://localhost:3001/api/bookings
```

---

## 🌐 Deployment Options

### Option A — Deploy on a VPS (e.g., DigitalOcean, Hetzner)

```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start server.js --name resilient

# Auto-start on reboot
pm2 save
pm2 startup
```

### Option B — Deploy on Railway / Render / Fly.io

1. Push the project to GitHub
2. Connect to Railway.app or Render.com
3. Set start command: `node server.js`
4. Done — they handle port and hosting automatically

### Option C — Static hosting (no backend needed)

If you only want the frontend without form-to-Excel:
- Upload `index.html` to any static host (Netlify, Vercel, GitHub Pages)
- The booking form will show a success message (form data won't be saved to Excel)
- Optionally replace the fetch call with a mailto: link or Formspree

---

## 🔑 Environment Variables (optional)

Create a `.env` file for configuration:

```env
PORT=3001
```

---

## 🎨 Customisation

### Update contact details
In `index.html`, search for and replace:
- `info@resilient-automation.com` — your actual email
- `linkedin.com/in/utpal-pathak` — your actual LinkedIn URL

### Add real background images
Replace the gradient slides in the `.hero-slides` section with actual industrial photos:

```html
<div class="hero-slide active" style="background-image: url('images/factory.jpg');"></div>
```

Place images in `public/images/` and reference them as above.

### Change accent color
In the `:root` CSS block, change `--gold: #f0a500` to your preferred color.

---

## 📱 Features

- ✅ Fully responsive (mobile, tablet, desktop)
- ✅ Animated hero slideshow with industrial circuit overlay
- ✅ Sticky navbar with transparent-to-dark scroll transition
- ✅ About section with glowing avatar, bio, and timeline
- ✅ 8 service cards with hover animations
- ✅ Booking modal with full form validation
- ✅ Excel export of all booking submissions
- ✅ File upload support in booking form
- ✅ Quick inquiry contact form
- ✅ Scroll-triggered fade-in animations
- ✅ SEO meta tags included

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (zero build step) |
| Fonts | Syne (headings) + DM Sans (body) via Google Fonts |
| Backend | Node.js + Express.js |
| Excel | xlsx npm package |
| File uploads | Multer |

---

© 2026 Resilient Enterprise FZE LLC. All rights reserved.
