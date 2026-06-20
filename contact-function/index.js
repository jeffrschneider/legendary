const functions = require('@google-cloud/functions-framework');
const { google } = require('googleapis');

// Configuration via environment variables (set at deploy time).
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';        // e.g. https://legendary.ai
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;              // from the Sheet's URL
const SHEET_NAME = process.env.SHEET_NAME || 'Submissions';

// Authenticates as the function's own service account (Application Default
// Credentials). Share the target Sheet with that account as Editor — no keys.
const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets('v4');

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

    if (!SPREADSHEET_ID) {
        console.error('SPREADSHEET_ID is not set');
        return res.status(500).json({ error: 'Server is not configured.' });
    }

    try {
        const client = await auth.getClient();
        await sheets.spreadsheets.values.append({
            auth: client,
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:E`,
            // RAW (not USER_ENTERED) so a message starting with '=' can't be
            // interpreted as a spreadsheet formula (CSV-injection safety).
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [[
                    new Date().toISOString(),
                    email,
                    message,
                    req.get('user-agent') || '',
                    req.get('x-forwarded-for') || '',
                ]],
            },
        });
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('Sheets append failed:', err);
        return res.status(500).json({ error: 'Could not save your message. Please try again.' });
    }
});
