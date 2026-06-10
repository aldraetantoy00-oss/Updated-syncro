const functions = require("firebase-functions");
const fetch = require("node-fetch");
const bcrypt = require('bcryptjs');
const { URLSearchParams } = require('url');

exports.generateCaption = functions.https.onRequest(async (req, res) => {
  try {
    const {text} = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer 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",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Create a social media caption for: ${text}`,
          },
        ],
      }),
    });

    const data = await response.json();

    res.json({
      caption: data.choices[0].message.content,
    });
  } catch (error) {
    res.status(500).send("Error generating caption");
  }
});

// Secure server-side login verifier
// Expects JSON body: { email, password }
// Requires environment variables set on the cloud function:
// - SUPABASE_URL (e.g. https://xyz.supabase.co)
// - SUPABASE_SERVICE_ROLE_KEY (service_role key)
exports.verifyLogin = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Server misconfigured' });
    }

    // Query users by email using Supabase REST with service role key
    const url = `${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/users?select=*&email=eq.${encodeURIComponent(email)}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: 'Upstream error', details: text });
    }

    const rows = await resp.json();
    const user = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Normalize $2y to $2a for bcryptjs
    let hash = user.password || '';
    if (typeof hash === 'string' && hash.startsWith('$2y$')) hash = hash.replace(/^\$2y\$/,'$2a$');

    const ok = bcrypt.compareSync(password, hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // remove sensitive fields
    delete user.password;

    return res.json({ user });
  } catch (err) {
    console.error('verifyLogin error', err);
    return res.status(500).json({ error: 'internal' });
  }
});
