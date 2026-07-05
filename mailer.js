const nodemailer = require('nodemailer');

const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Quality Inspection Agent';

const DEMO_MODE = !SMTP_USER || !SMTP_PASS;

let transporter = null;
if (!DEMO_MODE) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
}

/**
 * Send an email. Falls back to console logging if SMTP is not configured
 * (DEMO_MODE), so the app is fully usable without real credentials.
 */
async function sendMail({ to, subject, html, text }) {
    if (DEMO_MODE) {
        console.log('\n===== [DEMO EMAIL — SMTP not configured, see backend/.env.example] =====');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log(text || html);
        console.log('==========================================================================\n');
        return { demo: true, sent: true };
    }
    try {
        await transporter.sendMail({
            from: `"${FROM_NAME}" <${SMTP_USER}>`,
            to,
            subject,
            html,
            text
        });
        return { demo: false, sent: true };
    } catch (e) {
        console.error('Email send failed:', e.message);
        return { demo: false, sent: false, error: e.message };
    }
}

module.exports = { sendMail, DEMO_MODE };
