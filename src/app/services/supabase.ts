import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  supabase: SupabaseClient;

  constructor() {

    // Create Supabase client with auth persistence disabled, since this
    // app manages authentication via the `users` table and localStorage.
    try {
      this.supabase = createClient(
        environment.supabaseUrl,
        environment.supabaseAnonKey,
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
          environment.supabaseUrl,
          environment.supabaseAnonKey
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

  private async callAccountFunction(name: string, payload: Record<string, unknown>, authenticated = false) {
    const baseUrl = environment.supabaseFunctionsUrl;
    if (!baseUrl) return { data: null, error: new Error('Account services are not configured.') };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: environment.supabaseAnonKey,
      Authorization: `Bearer ${environment.supabaseAnonKey}`
    };
    if (authenticated) {
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      } catch (e) {}
    }

    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/account-service`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...payload, action: name })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { data: null, error: new Error(data.message || data.error || 'Account service request failed.') };
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // All Supabase Auth usage removed. Use the `users` table for auth.

  // Sign in through the server so approval checks and password verification cannot be bypassed client-side.
  async loginWithUsersTable(login: string, password: string): Promise<{ session: any | null; error: any | null }> {
    if (this._loginInProgress) return { session: null, error: new Error('login_in_progress') };
    if (!login || !password) return { session: null, error: new Error('login_and_password_required') };
    this._loginInProgress = true;
    try {
      const result = await this.callAccountFunction('verifyLogin', { login: login.trim(), password });
      if (result.error) return { session: null, error: result.error };
      const session = result.data.user;
      try {
        localStorage.setItem('user', JSON.stringify(session));
        localStorage.setItem('accessToken', result.data.accessToken);
      } catch (e) {}
      return { session, error: null };
    } finally {
      this._loginInProgress = false;
    }
  }

  // Register a new user in the `users` table. Returns { data, error }
  async signUpWithUsersTable(payload: { name: string; username: string; email: string; password: string; departmentId: number }) {
    const { name, username, email, password, departmentId } = payload;
    if (!name?.trim()) return { data: null, error: new Error('name_required') };
    if (!username?.trim()) return { data: null, error: new Error('username_required') };
    if (!email || !password) return { data: null, error: new Error('email_and_password_required') };
    if (!Number.isInteger(Number(departmentId))) return { data: null, error: new Error('department_required') };

    return this.callAccountFunction('requestAccount', {
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password,
      department_id: Number(departmentId)
    });
  }

  async getPendingAccountRequests() {
    const result = await this.callAccountFunction('getAccountRequests', {}, true);
    return { data: result.data?.requests || null, error: result.error };
  }

  async getSubmissions(): Promise<{ data: any[] | null; error: Error | null }> {
    const result = await this.callAccountFunction('getSubmissions', {}, true);
    const errorMessage = result.error && typeof result.error === 'object' && 'message' in result.error
      ? String(result.error.message)
      : String(result.error || '');
    const error = result.error ? new Error(errorMessage) : null;
    return { data: result.data?.submissions || null, error };
  }

  async approveAccountRequest(userId: string | number) {
    const result = await this.callAccountFunction('approveAccountRequest', { userId }, true);
    return { data: result.data?.approved ? { id: userId } : null, error: result.error };
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.callAccountFunction('changePassword', { currentPassword, newPassword }, true);
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

  // Sign out when using manual/local auth: remove stored user
  signOutLocal() {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
    } catch (e) {}
  }

  // Fetch profile by auth user id (tries `profiles` then `users` as fallback)
  async getProfileById(id: string) {
    if (!id) return null;
    const user = await this.getUser();
    return user && String(user.id) === String(id) ? this.profileFromUser(user) : null;
  }

  // Fetch profile by email (useful when auth UID differs from users.id)
  async getProfileByEmail(email: string) {
    if (!email) return null;
    const user = await this.getUser();
    return user && String(user.email).toLowerCase() === email.trim().toLowerCase()
      ? this.profileFromUser(user)
      : null;
  }

  private profileFromUser(user: any) {
    return {
      id: user.id,
      name: user.profile_name || user.name || null,
      full_name: user.profile_name || user.name || null,
      username: user.username || user.name || null,
      avatar_url: user.avatar_url || user.profile_photo_path || null,
      avatar: user.avatar_url || user.profile_photo_path || null,
      role: user.role || null,
      email: user.email || null,
      department_id: user.department_id || null,
      created_at: user.created_at || null
    };
  }

  // Convenience: get currently logged-in user's profile (tries id then email)
  async getCurrentUserProfile() {
    const user = await this.getUser();
    return user ? this.profileFromUser(user) : null;
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
    const result = await this.callAccountFunction('updateProfile', values, true);
    if (!result.error && result.data?.user) {
      try { localStorage.setItem('user', JSON.stringify(result.data.user)); } catch (e) {}
    }
    return result;
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