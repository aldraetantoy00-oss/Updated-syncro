#!/usr/bin/env node
/*
  Script: inspect_fix_passwords.js
  - Scans `users` table for rows where `password` is not a valid bcrypt hash
  - By default prints a CSV to stdout of affected users: id,email,password_preview
  - With `--fix` it will replace non-bcrypt passwords with a generated temporary password hash
    and write a mapping file `password_fixes.json` with { id, email, tempPassword }

  Usage:
    SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/inspect_fix_passwords.js
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/inspect_fix_passwords.js --fix

  NOTE: Running with --fix will change production data. Review output before running.
*/

const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const FIX = process.argv.includes('--fix');

async function fetchUsers() {
  const url = `${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/users?select=id,email,password`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Accept': 'application/json'
    }
  });
  if (!res.ok) throw new Error('Failed to fetch users ' + res.status);
  return res.json();
}

function isBcryptHash(s) {
  return typeof s === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(s);
}

function randomPassword() {
  return Math.random().toString(36).slice(2, 12) + 'A1!';
}

async function updatePassword(id, hash) {
  const url = `${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/users?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password: hash })
  });
  return res.ok;
}

(async function main(){
  try {
    const users = await fetchUsers();
    const bad = users.filter(u => !isBcryptHash((u.password||'').trim()));
    if (!bad.length) {
      console.log('No non-bcrypt password rows found.');
      process.exit(0);
    }

    console.log('id,email,password_preview');
    bad.forEach(u => {
      console.log(`${u.id},${u.email},${String(u.password||'').slice(0,20)}`);
    });

    if (FIX) {
      const mapping = [];
      for (const u of bad) {
        const temp = randomPassword();
        const hash = bcrypt.hashSync(temp, 10);
        const ok = await updatePassword(u.id, hash);
        mapping.push({ id: u.id, email: u.email, tempPassword: temp, updated: ok });
        console.log('Fixed', u.id, ok);
      }
      fs.writeFileSync('password_fixes.json', JSON.stringify(mapping, null, 2));
      console.log('Wrote password_fixes.json with temporary passwords for affected users. Invalidate sessions as needed.');
    } else {
      console.log('\nRun with --fix to replace non-bcrypt passwords with random temporary passwords.');
    }

  } catch (err) {
    console.error('Error:', err);
    process.exit(2);
  }
})();
