# Quality Inspection Agent — Enhanced Edition

Manufacturing production line inspection system — log inspections per batch,
flag defects with photo evidence + AI-assisted analysis, track pass/fail rates,
manage users/roles, get charts & AI recommendations, export reports, scan QR
codes, and more.

## What's new in this version

| Module | Status |
|---|---|
| Login with email verification (real SMTP) | ✅ |
| Login & Role Management (Admin/Inspector) | ✅ |
| Dashboard with Analytics | ✅ |
| Image Upload | ✅ |
| AI Defect Detection (TensorFlow.js MobileNet + pixel analysis, in-browser) | ✅ |
| Inspection History | ✅ |
| PDF & Excel Reports (+ CSV) | ✅ |
| Email Alerts (major/critical defects → admins) | ✅ |
| Product Categories | ✅ |
| Defect Analytics Charts | ✅ |
| AI Recommendations | ✅ |
| Notification Center | ✅ |
| QR/Barcode Scanner | ✅ |
| Dark Mode & Settings | ✅ |
| Live Camera Inspection (continuous feed defect scanning) | Not included this round |
| AI Chat Assistant | Not included this round |

## Project structure

```
quality-inspection-agent/
├── backend/
│   ├── server.js            Express API (auth, inspections, defects, reports, users, notifications)
│   ├── mailer.js             Nodemailer SMTP wrapper (falls back to console "demo mode")
│   ├── reportGenerator.js    Excel (ExcelJS) + PDF (PDFKit) report builders
│   ├── package.json
│   └── .env.example          Copy to .env and fill in your SMTP + secret values
└── frontend/
    ├── index.html
    ├── styles.css             Industrial theme + full dark mode
    └── app.js                 All frontend logic (SPA, no build step)
```

## How to run

1. Open a terminal in the `backend` folder:
   ```bash
   cd backend
   npm install
   npm start
   ```
2. You should see:
   ```
   Quality Inspection Agent server running on port 3000
   Open http://localhost:3000 in your browser
   ```
3. Open **http://localhost:3000** in your browser.

   ⚠️ Do **not** open `frontend/index.html` directly by double-clicking it —
   the backend serves the frontend itself, and API calls only work when the
   page is loaded through `http://localhost:3000`.

## Setting up real email (SMTP)

Email verification codes and defect alert emails will work in **demo mode**
out of the box — codes/alerts are printed to the backend terminal instead of
actually sent, so you can test everything without any setup.

To send real emails via Gmail:

1. Turn on 2-Step Verification on your Google account.
2. Go to **https://myaccount.google.com/apppasswords** and create an App
   Password for "Mail" (16 characters, no spaces).
3. Copy `backend/.env.example` to `backend/.env`.
4. Fill in:
   ```
   SMTP_USER=youraddress@gmail.com
   SMTP_PASS=your16charapppassword
   ```
5. Restart the server (`npm start`). You'll see
   `✅ SMTP configured — real emails will be sent via Gmail.` in the console.

## Demo credentials

| Role      | Username    | Password        |
|-----------|-------------|-----------------|
| Admin     | admin       | admin123        |
| Inspector | inspector   | inspector123    |

These two accounts are pre-verified so you can log in immediately. Any
**new** account you register must go through the email verification flow.

## About the AI Defect Detection module

This module runs **real TensorFlow.js inference in the browser** — it is not
a scripted fake. When you attach a defect photo, two things genuinely run:

1. **MobileNet v2** (a real pretrained image-classification model, loaded
   from a public CDN) extracts visual features from the photo and reports
   what it recognizes.
2. A **canvas-based pixel analysis** (Sobel-style edge gradients + local
   contrast variance) computes a genuine "surface anomaly score" from the
   actual pixel data of the uploaded image — this is a classic, real computer
   vision technique for flagging scratches, cracks, and texture irregularities.

**Important limitation to be transparent about:** MobileNet is a *general*
object classifier — it was not trained on your specific products or defect
types, so it cannot output "this is a hairline crack" the way a custom-trained
defect model could. Building that would require a labeled dataset of your
actual defect photos and a training pipeline, which is a separate project.
What's shipped here is a legitimate, functioning AI-assisted pre-screening
tool that gives inspectors a confidence score and flags images worth a closer
look — not a certified pass/fail authority. The UI is upfront about this
(see the note under every AI analysis result).

## Notes

- Data is stored as JSON files under `backend/data/` (auto-created on first run)
- Uploaded defect photos are stored under `backend/uploads/`
- Passwords are hashed with bcrypt; sessions use JWT (8-hour expiry)
- Pending (unverified) registrations expire after 15 minutes
- This is a local/demo-grade setup (file-based storage) — for production use,
  swap the JSON file storage for a real database.
- Charts use Chart.js, QR scanning uses jsQR, both loaded from public CDNs —
  an internet connection is required for those plus TensorFlow.js/MobileNet.
