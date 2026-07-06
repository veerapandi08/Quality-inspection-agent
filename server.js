require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { sendMail, DEMO_MODE } = require('./mailer');
const { buildExcelBuffer, buildPdfBuffer } = require('./reportGenerator');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'quality-inspection-secret-key-2026';

// ---------- Middleware ----------
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// ---------- Data storage ----------
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const INSPECTIONS_FILE = path.join(DATA_DIR, 'inspections.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const PENDING_USERS_FILE = path.join(DATA_DIR, 'pending_users.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function readJSON(filePath, defaultValue = []) {
    try {
        if (!fs.existsSync(filePath)) return defaultValue;
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return defaultValue;
    }
}
function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ---------- Seed default users ----------
function initUsers() {
    let users = readJSON(USERS_FILE, []);
    if (users.length === 0) {
        users.push({
            id: 1, username: 'admin',
            password: bcrypt.hashSync('admin123', 10),
            role: 'admin', fullName: 'Administrator',
            email: 'admin@quality.com', emailVerified: true,
            createdAt: new Date().toISOString()
        });
        users.push({
            id: 2, username: 'inspector',
            password: bcrypt.hashSync('inspector123', 10),
            role: 'inspector', fullName: 'Line Inspector',
            email: 'inspector@quality.com', emailVerified: true,
            createdAt: new Date().toISOString()
        });
        writeJSON(USERS_FILE, users);
    } else {
        // migrate old users to have emailVerified flag
        let changed = false;
        users.forEach(u => { if (u.emailVerified === undefined) { u.emailVerified = true; changed = true; } });
        if (changed) writeJSON(USERS_FILE, users);
    }
}
initUsers();

function initCategories() {
    let cats = readJSON(CATEGORIES_FILE, []);
    if (cats.length === 0) {
        cats = [
            { id: 'CAT-1', name: 'Electronics', description: 'Circuit boards, devices, wiring', createdAt: new Date().toISOString() },
            { id: 'CAT-2', name: 'Packaging', description: 'Boxes, seals, labels', createdAt: new Date().toISOString() },
            { id: 'CAT-3', name: 'Textiles', description: 'Fabric, stitching, garments', createdAt: new Date().toISOString() },
            { id: 'CAT-4', name: 'Automotive Parts', description: 'Metal/plastic components', createdAt: new Date().toISOString() },
            { id: 'CAT-5', name: 'Food & Beverage', description: 'Consumables, containers', createdAt: new Date().toISOString() }
        ];
        writeJSON(CATEGORIES_FILE, cats);
    }
}
initCategories();

// ---------- Multer (photo upload) ----------
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp/;
        const ok = allowed.test(path.extname(file.originalname).toLowerCase()) &&
                   allowed.test(file.mimetype);
        cb(ok ? null : new Error('Only image files are allowed'), ok);
    }
});

// ---------- Auth helpers ----------
function authMiddleware(req, res, next) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ error: 'No token provided' });
    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
}

// ---------- Notification helper ----------
function addNotification({ userId, role, title, message, type }) {
    const notifications = readJSON(NOTIFICATIONS_FILE, []);
    notifications.unshift({
        id: 'NOT-' + Date.now() + '-' + Math.round(Math.random() * 1000),
        userId: userId || null,   // null = broadcast to all
        role: role || null,       // e.g. 'admin' only
        title, message,
        type: type || 'info',     // info | success | warning | danger
        read: false,
        createdAt: new Date().toISOString()
    });
    writeJSON(NOTIFICATIONS_FILE, notifications.slice(0, 500));
}

// ================= AUTH ROUTES =================

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const users = readJSON(USERS_FILE, []);
    const user = users.find(u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    if (user.emailVerified === false) {
        return res.status(403).json({ error: 'Please verify your email before logging in.', needsVerification: true, email: user.email });
    }

    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
        SECRET_KEY, { expiresIn: '8h' }
    );
    res.json({
        token,
        user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName, email: user.email }
    });
});

// Step 1 of registration: create pending user + send verification code
app.post('/api/auth/register', async (req, res) => {
    const { username, password, fullName, email, role } = req.body;
    if (!username || !password || !fullName || !email) {
        return res.status(400).json({ error: 'Username, password, full name, and email are required' });
    }
    const users = readJSON(USERS_FILE, []);
    if (users.find(u => u.username === username)) {
        return res.status(409).json({ error: 'Username already exists' });
    }
    if (users.find(u => u.email === email)) {
        return res.status(409).json({ error: 'Email already registered' });
    }

    let pending = readJSON(PENDING_USERS_FILE, []);
    pending = pending.filter(p => p.username !== username && p.email !== email); // clear stale attempts

    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
    pending.push({
        username, password: bcrypt.hashSync(password, 10),
        fullName, email, role: role === 'admin' ? 'admin' : 'inspector',
        code, codeExpires: Date.now() + 15 * 60 * 1000, // 15 min
        createdAt: new Date().toISOString()
    });
    writeJSON(PENDING_USERS_FILE, pending);

    await sendMail({
        to: email,
        subject: 'Verify your email — Quality Inspection Agent',
        text: `Your verification code is: ${code}\nThis code expires in 15 minutes.`,
        html: `<div style="font-family:sans-serif"><h2>Verify your email</h2>
               <p>Your verification code is:</p>
               <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>
               <p>This code expires in 15 minutes.</p></div>`
    });

    res.status(201).json({
        message: DEMO_MODE
            ? 'Verification code generated (DEMO MODE — check server console since SMTP is not configured).'
            : 'Verification code sent to your email.',
        demoMode: DEMO_MODE
    });
});

// Step 2 of registration: verify code, actually create the account
app.post('/api/auth/verify-email', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    let pending = readJSON(PENDING_USERS_FILE, []);
    const entry = pending.find(p => p.email === email);
    if (!entry) return res.status(404).json({ error: 'No pending registration found for this email' });
    if (Date.now() > entry.codeExpires) return res.status(400).json({ error: 'Code expired. Please register again.' });
    if (entry.code !== String(code)) return res.status(400).json({ error: 'Incorrect verification code' });

    const users = readJSON(USERS_FILE, []);
    const newUser = {
        id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
        username: entry.username,
        password: entry.password,
        role: entry.role,
        fullName: entry.fullName,
        email: entry.email,
        emailVerified: true,
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    writeJSON(USERS_FILE, users);

    pending = pending.filter(p => p.email !== email);
    writeJSON(PENDING_USERS_FILE, pending);

    addNotification({ role: 'admin', title: 'New user registered', message: `${newUser.fullName} (${newUser.role}) joined`, type: 'info' });

    res.json({ message: 'Email verified! You can now log in.' });
});

app.post('/api/auth/resend-code', async (req, res) => {
    const { email } = req.body;
    let pending = readJSON(PENDING_USERS_FILE, []);
    const entry = pending.find(p => p.email === email);
    if (!entry) return res.status(404).json({ error: 'No pending registration found for this email' });

    entry.code = String(Math.floor(100000 + Math.random() * 900000));
    entry.codeExpires = Date.now() + 15 * 60 * 1000;
    writeJSON(PENDING_USERS_FILE, pending);

    await sendMail({
        to: email,
        subject: 'Your new verification code — Quality Inspection Agent',
        text: `Your new verification code is: ${entry.code}\nExpires in 15 minutes.`,
        html: `<p>Your new verification code is:</p><p style="font-size:28px;font-weight:bold;">${entry.code}</p>`
    });

    res.json({ message: DEMO_MODE ? 'Code resent (check server console).' : 'Code resent to your email.' });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

// ================= USER / ROLE MANAGEMENT (admin) =================

app.get('/api/users', authMiddleware, adminOnly, (req, res) => {
    const users = readJSON(USERS_FILE, []).map(u => ({
        id: u.id, username: u.username, fullName: u.fullName,
        email: u.email, role: u.role, emailVerified: u.emailVerified, createdAt: u.createdAt
    }));
    res.json({ users });
});

app.put('/api/users/:id/role', authMiddleware, adminOnly, (req, res) => {
    const { role } = req.body;
    if (!['admin', 'inspector'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const users = readJSON(USERS_FILE, []);
    const idx = users.findIndex(u => u.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    users[idx].role = role;
    writeJSON(USERS_FILE, users);
    res.json({ message: 'Role updated', user: { id: users[idx].id, role: users[idx].role } });
});

app.delete('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
    let users = readJSON(USERS_FILE, []);
    if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: "You can't delete your own account" });
    users = users.filter(u => u.id !== Number(req.params.id));
    writeJSON(USERS_FILE, users);
    res.json({ message: 'User deleted' });
});

// ================= CATEGORIES =================

app.get('/api/categories', authMiddleware, (req, res) => {
    res.json({ categories: readJSON(CATEGORIES_FILE, []) });
});

app.post('/api/categories', authMiddleware, adminOnly, (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    const cats = readJSON(CATEGORIES_FILE, []);
    const newCat = { id: 'CAT-' + Date.now(), name, description: description || '', createdAt: new Date().toISOString() };
    cats.push(newCat);
    writeJSON(CATEGORIES_FILE, cats);
    res.status(201).json({ category: newCat });
});

app.delete('/api/categories/:id', authMiddleware, adminOnly, (req, res) => {
    let cats = readJSON(CATEGORIES_FILE, []);
    cats = cats.filter(c => c.id !== req.params.id);
    writeJSON(CATEGORIES_FILE, cats);
    res.json({ message: 'Category deleted' });
});

// ================= INSPECTIONS =================

app.get('/api/inspections', authMiddleware, (req, res) => {
    let inspections = readJSON(INSPECTIONS_FILE, []);
    const { status, productLine, category, search } = req.query;

    if (status) inspections = inspections.filter(i => i.status === status);
    if (productLine) inspections = inspections.filter(i => i.productLine === productLine);
    if (category) inspections = inspections.filter(i => i.category === category);
    if (search) {
        const term = search.toLowerCase();
        inspections = inspections.filter(i =>
            i.itemName.toLowerCase().includes(term) ||
            i.batchNumber.toLowerCase().includes(term)
        );
    }
    inspections.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ inspections });
});

app.get('/api/inspections/:id', authMiddleware, (req, res) => {
    const inspections = readJSON(INSPECTIONS_FILE, []);
    const inspection = inspections.find(i => i.id === req.params.id);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    res.json({ inspection });
});

app.post('/api/inspections', authMiddleware, (req, res) => {
    const { productLine, itemName, batchNumber, category, status, notes, qrCode } = req.body;
    if (!productLine || !itemName || !batchNumber) {
        return res.status(400).json({ error: 'Product line, item name, and batch number are required' });
    }
    const inspections = readJSON(INSPECTIONS_FILE, []);
    const id = 'INS-' + Date.now();
    const newInspection = {
        id,
        productLine, itemName, batchNumber,
        category: category || '',
        qrCode: qrCode || id,
        status: status || 'pending',
        notes: notes || '',
        defects: [],
        aiAnalyses: [],
        inspectorId: req.user.id,
        inspectorName: req.user.fullName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    inspections.push(newInspection);
    writeJSON(INSPECTIONS_FILE, inspections);
    res.status(201).json({ inspection: newInspection });
});

app.put('/api/inspections/:id', authMiddleware, (req, res) => {
    const inspections = readJSON(INSPECTIONS_FILE, []);
    const idx = inspections.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Inspection not found' });

    const { status, notes, productLine, itemName, batchNumber, category } = req.body;
    const prevStatus = inspections[idx].status;
    if (status) inspections[idx].status = status;
    if (notes !== undefined) inspections[idx].notes = notes;
    if (productLine) inspections[idx].productLine = productLine;
    if (itemName) inspections[idx].itemName = itemName;
    if (batchNumber) inspections[idx].batchNumber = batchNumber;
    if (category !== undefined) inspections[idx].category = category;
    inspections[idx].updatedAt = new Date().toISOString();

    writeJSON(INSPECTIONS_FILE, inspections);

    if (status && status !== prevStatus && status === 'fail') {
        addNotification({ role: 'admin', title: 'Inspection failed', message: `${inspections[idx].itemName} (${inspections[idx].id}) marked FAIL`, type: 'danger' });
    }
    res.json({ inspection: inspections[idx] });
});

app.delete('/api/inspections/:id', authMiddleware, adminOnly, (req, res) => {
    let inspections = readJSON(INSPECTIONS_FILE, []);
    const target = inspections.find(i => i.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Inspection not found' });

    (target.defects || []).forEach(d => {
        if (d.photo) {
            const photoPath = path.join(UPLOADS_DIR, d.photo);
            if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
        }
    });

    inspections = inspections.filter(i => i.id !== req.params.id);
    writeJSON(INSPECTIONS_FILE, inspections);
    res.json({ message: 'Inspection deleted' });
});

// ---------- Defect + photo upload (with optional AI analysis payload from frontend) ----------
app.post('/api/inspections/:id/defects', authMiddleware, upload.single('photo'), async (req, res) => {
    const inspections = readJSON(INSPECTIONS_FILE, []);
    const idx = inspections.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Inspection not found' });

    const { description, severity, aiConfidence, aiLabel } = req.body;
    if (!description) return res.status(400).json({ error: 'Defect description is required' });

    const defect = {
        id: 'DEF-' + Date.now(),
        description,
        severity: severity || 'minor',
        photo: req.file ? req.file.filename : null,
        aiLabel: aiLabel || null,
        aiConfidence: aiConfidence ? Number(aiConfidence) : null,
        reportedBy: req.user.fullName,
        createdAt: new Date().toISOString()
    };

    inspections[idx].defects.push(defect);
    inspections[idx].status = 'fail';
    inspections[idx].updatedAt = new Date().toISOString();
    writeJSON(INSPECTIONS_FILE, inspections);

    addNotification({
        role: 'admin',
        title: `Defect logged (${severity || 'minor'})`,
        message: `${description} on ${inspections[idx].itemName} (${inspections[idx].id})`,
        type: severity === 'critical' ? 'danger' : severity === 'major' ? 'warning' : 'info'
    });

    // Email alert for major/critical defects
    if (severity === 'major' || severity === 'critical') {
        const users = readJSON(USERS_FILE, []);
        const admins = users.filter(u => u.role === 'admin' && u.email);
        for (const admin of admins) {
            await sendMail({
                to: admin.email,
                subject: `⚠️ ${severity.toUpperCase()} defect reported — ${inspections[idx].itemName}`,
                text: `A ${severity} defect was reported.\n\nItem: ${inspections[idx].itemName}\nBatch: ${inspections[idx].batchNumber}\nLine: ${inspections[idx].productLine}\nDescription: ${description}\nReported by: ${req.user.fullName}`,
                html: `<div style="font-family:sans-serif">
                    <h2 style="color:${severity === 'critical' ? '#c0392b' : '#b8860b'}">${severity.toUpperCase()} Defect Reported</h2>
                    <p><b>Item:</b> ${inspections[idx].itemName}<br/>
                    <b>Batch:</b> ${inspections[idx].batchNumber}<br/>
                    <b>Line:</b> ${inspections[idx].productLine}<br/>
                    <b>Description:</b> ${description}<br/>
                    <b>Reported by:</b> ${req.user.fullName}</p></div>`
            });
        }
    }

    res.status(201).json({ defect, inspection: inspections[idx] });
});

app.delete('/api/inspections/:id/defects/:defectId', authMiddleware, (req, res) => {
    const inspections = readJSON(INSPECTIONS_FILE, []);
    const idx = inspections.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Inspection not found' });

    const defect = inspections[idx].defects.find(d => d.id === req.params.defectId);
    if (defect && defect.photo) {
        const photoPath = path.join(UPLOADS_DIR, defect.photo);
        if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    }
    inspections[idx].defects = inspections[idx].defects.filter(d => d.id !== req.params.defectId);
    if (inspections[idx].defects.length === 0 && inspections[idx].status === 'fail') {
        inspections[idx].status = 'pending';
    }
    inspections[idx].updatedAt = new Date().toISOString();
    writeJSON(INSPECTIONS_FILE, inspections);
    res.json({ inspection: inspections[idx] });
});

// Lookup by QR/barcode value (scans return an inspection id or batch number)
app.get('/api/inspections/lookup/:code', authMiddleware, (req, res) => {
    const inspections = readJSON(INSPECTIONS_FILE, []);
    const found = inspections.find(i => i.id === req.params.code || i.qrCode === req.params.code || i.batchNumber === req.params.code);
    if (!found) return res.status(404).json({ error: 'No inspection found for this code' });
    res.json({ inspection: found });
});

// ================= REPORTS / ANALYTICS =================

app.get('/api/reports/summary', authMiddleware, (req, res) => {
    const inspections = readJSON(INSPECTIONS_FILE, []);
    const total = inspections.length;
    const passed = inspections.filter(i => i.status === 'pass').length;
    const failed = inspections.filter(i => i.status === 'fail').length;
    const pending = inspections.filter(i => i.status === 'pending').length;
    const totalDefects = inspections.reduce((sum, i) => sum + (i.defects ? i.defects.length : 0), 0);

    const bySeverity = { minor: 0, major: 0, critical: 0 };
    inspections.forEach(i => (i.defects || []).forEach(d => {
        if (bySeverity[d.severity] !== undefined) bySeverity[d.severity]++;
    }));

    const byProductLine = {};
    inspections.forEach(i => { byProductLine[i.productLine] = (byProductLine[i.productLine] || 0) + 1; });

    const byCategory = {};
    inspections.forEach(i => {
        const c = i.category || 'Uncategorized';
        byCategory[c] = (byCategory[c] || 0) + 1;
    });

    // last 14 days trend
    const trend = {};
    for (let d = 13; d >= 0; d--) {
        const day = new Date();
        day.setDate(day.getDate() - d);
        const key = day.toISOString().slice(0, 10);
        trend[key] = { pass: 0, fail: 0, pending: 0 };
    }
    inspections.forEach(i => {
        const key = new Date(i.createdAt).toISOString().slice(0, 10);
        if (trend[key]) trend[key][i.status] = (trend[key][i.status] || 0) + 1;
    });

    res.json({
        total, passed, failed, pending,
        passRate: total ? Math.round((passed / total) * 100) : 0,
        totalDefects, bySeverity, byProductLine, byCategory, trend
    });
});

app.get('/api/reports/recommendations', authMiddleware, (req, res) => {
    const inspections = readJSON(INSPECTIONS_FILE, []);
    const recs = [];

    const bySeverity = { minor: 0, major: 0, critical: 0 };
    const byProductLine = {};
    const byDescriptionWord = {};

    inspections.forEach(i => (i.defects || []).forEach(d => {
        if (bySeverity[d.severity] !== undefined) bySeverity[d.severity]++;
        byProductLine[i.productLine] = (byProductLine[i.productLine] || 0) + 1;
        d.description.toLowerCase().split(/\s+/).forEach(w => {
            if (w.length > 3) byDescriptionWord[w] = (byDescriptionWord[w] || 0) + 1;
        });
    }));

    const total = inspections.length;
    const failed = inspections.filter(i => i.status === 'fail').length;
    const passRate = total ? Math.round(((total - failed) / total) * 100) : 100;

    if (passRate < 70 && total > 3) {
        recs.push({ level: 'critical', text: `Pass rate is ${passRate}%, below the healthy 70% threshold. Investigate root causes across all lines immediately.` });
    } else if (passRate < 85 && total > 3) {
        recs.push({ level: 'warning', text: `Pass rate is ${passRate}%. Consider a focused quality review to push this above 90%.` });
    }

    if (bySeverity.critical > 0) {
        recs.push({ level: 'critical', text: `${bySeverity.critical} critical defect(s) recorded. Prioritize root-cause analysis and consider halting the affected line.` });
    }

    const topLine = Object.entries(byProductLine).sort((a, b) => b[1] - a[1])[0];
    if (topLine && topLine[1] >= 2) {
        recs.push({ level: 'warning', text: `Production line "${topLine[0]}" accounts for the most defects (${topLine[1]}). Recommend equipment/process audit on this line.` });
    }

    const topWord = Object.entries(byDescriptionWord).sort((a, b) => b[1] - a[1])[0];
    if (topWord && topWord[1] >= 3) {
        recs.push({ level: 'info', text: `The term "${topWord[0]}" appears frequently in defect notes (${topWord[1]}x). This may indicate a recurring root cause worth targeted training.` });
    }

    if (recs.length === 0) {
        recs.push({ level: 'success', text: 'Quality metrics look healthy. No urgent action items detected — keep up current inspection cadence.' });
    }

    res.json({ recommendations: recs });
});

app.get('/api/export/inspections.csv', authMiddleware, (req, res) => {
    const inspections = readJSON(INSPECTIONS_FILE, []);
    const header = 'ID,Product Line,Item,Batch,Category,Status,Defects,Inspector,Created At\n';
    const rows = inspections.map(i =>
        [i.id, i.productLine, i.itemName, i.batchNumber, i.category || '', i.status,
         (i.defects || []).length, i.inspectorName, i.createdAt].join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inspections.csv');
    res.send(header + rows);
});
// keep old path working too
app.get('/api/export/inspections', (req, res) => res.redirect('/api/export/inspections.csv'));

app.get('/api/export/inspections.xlsx', authMiddleware, async (req, res) => {
    try {
        const inspections = readJSON(INSPECTIONS_FILE, []);
        const buffer = await buildExcelBuffer(inspections);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=inspections-report.xlsx');
        res.send(buffer);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to generate Excel report' });
    }
});

app.get('/api/export/inspections.pdf', authMiddleware, async (req, res) => {
    try {
        const inspections = readJSON(INSPECTIONS_FILE, []);
        const total = inspections.length;
        const passed = inspections.filter(i => i.status === 'pass').length;
        const failed = inspections.filter(i => i.status === 'fail').length;
        const pending = inspections.filter(i => i.status === 'pending').length;
        const totalDefects = inspections.reduce((s, i) => s + (i.defects || []).length, 0);
        const summaryStats = { total, passed, failed, pending, passRate: total ? Math.round((passed / total) * 100) : 0, totalDefects };

        const buffer = await buildPdfBuffer(inspections, summaryStats);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=inspection-report.pdf');
        res.send(buffer);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to generate PDF report' });
    }
});

// ================= NOTIFICATIONS =================

app.get('/api/notifications', authMiddleware, (req, res) => {
    let notifications = readJSON(NOTIFICATIONS_FILE, []);
    notifications = notifications.filter(n =>
        (!n.userId || n.userId === req.user.id) && (!n.role || n.role === req.user.role)
    );
    res.json({ notifications: notifications.slice(0, 50) });
});

app.put('/api/notifications/:id/read', authMiddleware, (req, res) => {
    const notifications = readJSON(NOTIFICATIONS_FILE, []);
    const idx = notifications.findIndex(n => n.id === req.params.id);
    if (idx !== -1) { notifications[idx].read = true; writeJSON(NOTIFICATIONS_FILE, notifications); }
    res.json({ message: 'Marked as read' });
});

app.put('/api/notifications/read-all', authMiddleware, (req, res) => {
    const notifications = readJSON(NOTIFICATIONS_FILE, []);
    notifications.forEach(n => {
        if ((!n.userId || n.userId === req.user.id) && (!n.role || n.role === req.user.role)) n.read = true;
    });
    writeJSON(NOTIFICATIONS_FILE, notifications);
    res.json({ message: 'All marked as read' });
});

// ================= STATIC / SPA FALLBACK =================

app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use((err, req, res, next) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
});

app.listen(PORT, () => {
    console.log(`Quality Inspection Agent server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    if (DEMO_MODE) {
        console.log('⚠️  SMTP not configured — emails will be logged to this console (DEMO MODE).');
        console.log('   To send real emails, copy backend/.env.example to backend/.env and fill in SMTP_USER/SMTP_PASS.');
    } else {
        console.log('✅ SMTP configured — real emails will be sent via Gmail.');
    }
});
