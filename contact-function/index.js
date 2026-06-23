const functions = require('@google-cloud/functions-framework');
const { google } = require('googleapis');

// Configuration via environment variables (set at deploy time).
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';        // e.g. https://legendary.ai or *
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;              // from the Sheet's URL
const SHEET_NAME = process.env.SHEET_NAME || 'Submissions';

// Authenticates as the function's own service account (Application Default
// Credentials). Share the target Sheet with that account as Editor — no keys.
const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets('v4');

const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

// Format "now" as Mountain Time (America/Denver, DST-aware): "2026-06-20 08:38:21 MDT"
function mountainTimestamp() {
    const d = new Date();
    const datePart = d.toLocaleString('sv-SE', { timeZone: 'America/Denver', hour12: false }); // 2026-06-20 08:38:21
    const tz = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', timeZoneName: 'short' })
        .formatToParts(d).find((p) => p.type === 'timeZoneName').value; // MDT / MST
    return `${datePart} ${tz}`;
}

// Resolve a client IP to "City, Region, Country" via ip-api.com (no key,
// server-side friendly). Best-effort: returns '' on any failure so a
// submission is never lost.
async function geoLocation(ip) {
    if (!ip) return '';
    try {
        const res = await fetch(
            `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city`,
            { signal: AbortSignal.timeout(4000) }
        );
        if (!res.ok) return '';
        const j = await res.json();
        if (j.status !== 'success') return '';
        return [j.city, j.regionName, j.country].filter(Boolean).join(', ');
    } catch (err) {
        console.error('geo lookup failed:', err);
        return '';
    }
}

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
    const name = String(body.name || '').trim().slice(0, 200);
    const company = String(body.company || '').trim().slice(0, 200);
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

    const clientIp = String(req.get('x-forwarded-for') || '').split(',')[0].trim();
    const location = await geoLocation(clientIp);

    try {
        const client = await auth.getClient();
        await sheets.spreadsheets.values.append({
            auth: client,
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:F`,
            // RAW so a message starting with '=' can't become a spreadsheet formula.
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [[mountainTimestamp(), name, company, email, message, location]],
            },
        });
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('Sheets append failed:', err);
        return res.status(500).json({ error: 'Could not save your message. Please try again.' });
    }
});
