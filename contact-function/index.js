const functions = require('@google-cloud/functions-framework');
const sgMail = require('@sendgrid/mail');

// Configuration via environment variables (set at deploy time).
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';      // e.g. https://legendary.ai
const TO_EMAIL = process.env.TO_EMAIL || 'jeffrschneider@gmail.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@legendary.ai'; // MUST be a verified sender in SendGrid

const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

functions.http('contact', async (req, res) => {
    // --- CORS ---
    res.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.set('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600');
        return res.status(204).send('');
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body || {};
    const email = String(body.email || '').trim();
    const message = String(body.message || '').trim();
    const honeypot = String(body._gotcha || '').trim();

    // Spam honeypot: bots fill hidden fields. Pretend success and drop it.
    if (honeypot) return res.status(200).json({ ok: true });

    if (!email || !message) {
        return res.status(400).json({ error: 'Email and message are required.' });
    }
    if (!isEmail(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (message.length > 5000) {
        return res.status(400).json({ error: 'Message is too long.' });
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
        console.error('SENDGRID_API_KEY is not set');
        return res.status(500).json({ error: 'Server is not configured.' });
    }
    sgMail.setApiKey(apiKey);

    try {
        await sgMail.send({
            to: TO_EMAIL,
            from: FROM_EMAIL,         // verified sender / domain in SendGrid
            replyTo: email,           // so you can reply straight to the prospect
            subject: `New inquiry from legendary.ai — ${email}`,
            text: `From: ${email}\n\n${message}`,
        });
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('SendGrid error:', err?.response?.body || err);
        return res.status(502).json({ error: 'Could not send your message. Please try again.' });
    }
});
