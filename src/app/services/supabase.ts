import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  supabase: SupabaseClient;
  private authOpQueue: Promise<any> = Promise.resolve();

  constructor() {

    // Create Supabase client with auth persistence disabled, since this
    // app manages authentication via the `users` table and localStorage.
    try {
      this.supabase = createClient(
        'https://hplgfkgocbbwwgyzzzmx.supabase.co',
        'sb_publishable_Qj5I14JD8S6K0IF_kxL_vg_BJ3tnfwA',
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );
    } catch (e) {
      // Fallback: create minimal client if options not supported in this env
      try {
        this.supabase = createClient(
          'https://hplgfkgocbbwwgyzzzmx.supabase.co',
          'sb_publishable_Qj5I14JD8S6K0IF_kxL_vg_BJ3tnfwA'
        );
      } catch (err) {
        console.error('Failed to create Supabase client', err);
        throw err;
      }
    }

  }

  // This service uses the Supabase client for database queries only.
  // All Supabase Auth usage has been removed in favor of using the `users` table.

  // Simple in-service login lock to ensure only one auth login runs at a time
  private _loginInProgress = false;

  // All Supabase Auth usage removed. Use the `users` table for auth.

  // Sign in using custom `users` table. This performs password verification
  // in the client using bcryptjs and stores a sanitized user in localStorage.
  // Returns an object { data, error } similar to Supabase conventions.
  // Login using the `users` table only. Returns { session, error } where
  // session = { id, email, role } on success.
  async loginWithUsersTable(email: string, password: string): Promise<{ session: any | null; error: any | null }> {
    if (this._loginInProgress) return { session: null, error: new Error('login_in_progress') };
    if (!email || !password) return { session: null, error: new Error('email_and_password_required') };
    this._loginInProgress = true;
    try {
      const row: any = await this.runAuthOp(async () => {
        return await this.supabase
          .from('users')
          .select('id, email, password, role')
          .eq('email', email)
          .maybeSingle();
      });

      const userRow = row?.data ?? null;
      const dbError = row?.error ?? null;
      if (dbError) return { session: null, error: dbError };
      if (!userRow) return { session: null, error: new Error('Invalid credentials') };

      const stored = (userRow.password || '').trim();
      if (!stored) return { session: null, error: new Error('Invalid credentials') };

      // bcrypt check
      let isBcrypt = false;
      let hash = stored;
      if (stored.match(/^\$2[aby]\$/) || stored.startsWith('$2y$')) {
        isBcrypt = true;
        if (stored.startsWith('$2y$')) hash = stored.replace(/^\$2y\$/, '$2a$');
      }

      let match = false;
      if (isBcrypt) {
        let bcrypt: any = null;
        try {
          // @ts-ignore
          bcrypt = (await import('bcryptjs'))?.default ?? (await import('bcryptjs'));
        } catch (e) {
          return { session: null, error: new Error('Password verification failed') };
        }
        try {
          match = await new Promise<boolean>((resolve, reject) => {
            try {
              bcrypt.compare(password, hash, (err: any, same: boolean) => {
                if (err) return reject(err);
                resolve(!!same);
              });
            } catch (ex) { reject(ex); }
          });
        } catch (e) {
          return { session: null, error: new Error('Password verification failed') };
        }
      } else {
        match = password === stored;
      }

      if (!match) return { session: null, error: new Error('Invalid credentials') };

      // Normalize role values to a consistent canonical set to avoid
      // guard mismatches and redirect loops (e.g. 'org' vs 'ORGANIZATION').
      let rawRole = (userRow.role || '').toString().trim();
      let normalized = rawRole ? rawRole.toUpperCase() : '';
      if (!normalized) normalized = 'CREATOR';
      if (normalized === 'ORG' || normalized === 'ORGANISATION') normalized = 'ORGANIZATION';
      // Accept a couple of common synonyms
      if (normalized === 'ORGANISATION') normalized = 'ORGANIZATION';
      const session = { id: userRow.id, email: userRow.email, role: normalized };
      try { localStorage.setItem('user', JSON.stringify(session)); } catch (e) {}
      return { session, error: null };
    } finally {
      this._loginInProgress = false;
    }
  }

  // Register a new user in the `users` table. Returns { data, error }
  async signUpWithUsersTable(payload: { username?: string; email: string; password: string; role?: string }) {
    const { username, email, password, role } = payload as any;
    if (!email || !password) return { data: null, error: new Error('email_and_password_required') };

    // Hash password
    let hash: string | null = null;
    try {
      // @ts-ignore
      const bcrypt = (await import('bcryptjs'))?.default ?? (await import('bcryptjs'));
      hash = await bcrypt.hash(password, 10);
    } catch (e) {
      // If hashing fails, do not store plaintext in DB in production; return error
      return { data: null, error: new Error('Password hashing failed') };
    }

    const insertObj: any = {
      username: username || null,
      email,
      password: hash,
      role: role || 'org'
    };

    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert([insertObj]);
      if (error) return { data: null, error };
      const created = Array.isArray(data) ? data[0] : data;
      if (created) {
        try { delete (created as any).password; } catch (e) {}
        try { localStorage.setItem('user', JSON.stringify(created)); } catch (e) {}
      }
      return { data: created, error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  }

  // Get the current authenticated user object
  // Get the current authenticated user object.
  // Prefer `localStorage.user` when present (manual auth fallback).
  async getUser() {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          // fallthrough to null
        }
      }
    } catch (e) {
      // ignore localStorage errors
    }

    // No Supabase Auth in this app; return null when no local session present.
    return null;
  }

  // Serialize Supabase auth operations to avoid Navigator Lock conflicts
  private runAuthOp<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.authOpQueue.then(() => fn());
    // keep queue alive even if operation rejects
    this.authOpQueue = next.catch(() => {});
    return next;
  }

  // NOTE: legacy Supabase Auth usage removed. This service uses the `users` table for auth.

  // Sign out when using manual/local auth: remove stored user
  signOutLocal() {
    try { localStorage.removeItem('user'); } catch (e) {}
  }

  // Fetch profile by auth user id (tries `profiles` then `users` as fallback)
  async getProfileById(id: string) {
    if (!id) return null;
    try {
      const { data: pData, error: pErr } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (pData && !pErr) {
        const row: any = pData;
        return {
          ...pData,
          full_name: row.full_name || row.name || null,
          avatar_url: row.avatar_url || row.avatar || null
        };
      }
    } catch (e) {
      // ignore table missing / type errors and fallback to auth metadata
      console.warn('profiles lookup failed', e);
    }

    try {
      const { data: uData, error: uErr } = await this.supabase
        .from('users')
        .select('id, name, avatar, email, role, created_at')
        .eq('id', id)
        .maybeSingle();
      if (uData && !uErr) {
        return {
          id: uData.id,
          full_name: uData.name || null,
          avatar_url: uData.avatar || null,
          role: uData.role || null,
          email: uData.email || null,
          created_at: uData.created_at || null
        };
      }
    } catch (e) {
      console.warn('users lookup failed', e);
    }

    return null;
  }

  // Fetch profile by email (useful when auth UID differs from users.id)
  async getProfileByEmail(email: string) {
    if (!email) return null;
    try {
      const { data: pByEmail, error: pErr } = await this.supabase
        .from('users')
        .select('id, name, avatar, role, email, created_at')
        .eq('email', email)
        .maybeSingle();
      if (pByEmail && !pErr) {
        const row: any = pByEmail;
        return {
          ...pByEmail,
          full_name: row.full_name || row.name || null,
          avatar_url: row.avatar_url || row.avatar || null
        };
      }
    } catch (e) {
      console.warn('profiles by email lookup failed', e);
    }

    try {
      const { data: uByEmail, error: uErr } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (uByEmail && !uErr) {
        // normalize to profile shape if possible
        const row: any = uByEmail;
        return {
          id: uByEmail.id,
          full_name: row.full_name || row.name || null,
          avatar_url: row.avatar_url || row.avatar || null,
          role: uByEmail.role || null,
          email: uByEmail.email || null,
          created_at: uByEmail.created_at || null
        };
      }
    } catch (e) {
      console.warn('users by email lookup failed', e);
    }

    return null;
  }

  // Convenience: get currently logged-in user's profile (tries id then email)
  async getCurrentUserProfile() {
    const user = await this.getUser();
    if (!user) return null;
    const id = (user as any).id;
    const email = (user as any).email;

    // prefer profile by id, but handle missing tables or type mismatches
    let profile = null;
    if (id) {
      try { profile = await this.getProfileById(id); } catch(e) { profile = null; }
    }
    if (profile) return profile;

    if (email) {
      try { profile = await this.getProfileByEmail(email); } catch(e) { profile = null; }
      if (profile) return profile;
    }

    // fallback to auth metadata
    const meta = (user as any).user_metadata || {};
    return {
      id: (meta && meta.profile_id) || null,
      full_name: meta?.full_name || meta?.name || null,
      avatar_url: meta?.avatar_url || meta?.avatar || null,
      role: meta?.role || null,
      email: (user as any).email || null,
      created_at: (user as any).created_at || null
    };
  }

  // Helper: return application-level numeric profile id when available
  async getAppUserId() {
    const profile = await this.getCurrentUserProfile();
    if (!profile) return null;
    const id = profile.id;
    if (id === null || id === undefined) return null;
    // accept numeric ids only
    if (/^\d+$/.test(String(id))) return Number(id);
    // fallback: if auth user id (from Supabase session or local user) is numeric, use it
    try {
      const user = await this.getUser();
      if (user && user.id && /^\d+$/.test(String(user.id))) return Number(user.id);
    } catch (e) {}
    return null;
  }

  // Update profile in `profiles` table (partial update)
  async updateProfile(id: string, values: Record<string, any>) {
    if (!id) return { error: 'no-id' };
    const { data, error } = await this.supabase
      .from('users')
      .update(values)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data, error };
  }

  // Get submissions for a user (if table exists)
  async getUserSubmissions(userId: string) {
    if (!userId) return [];
    try {
      const { data, error } = await this.supabase
        .from('submissions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } catch (e) {
      return [];
    }
  }
}