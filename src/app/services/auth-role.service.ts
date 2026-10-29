import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthRoleService {
  private _role: string | null = null;

  constructor(private supabase: SupabaseService) {}

  async loadRole() {
    if (!environment.production && typeof localStorage !== 'undefined') {
      const debugRole = localStorage.getItem('debugRole');
      if (debugRole) {
        this._role = debugRole.trim().toUpperCase();
        return this._role;
      }
    }
    if (this._role) return this._role;
    // Try to read role from auth user (localStorage or Supabase session) to avoid extra DB queries
    try {
      const user = await this.supabase.getUser();
      const maybeRole = (user && (user.role || (user as any).user_metadata?.role)) || null;
      if (maybeRole) {
        this._role = String(maybeRole).trim().toUpperCase();
        return this._role;
      }
    } catch (e) {
      // ignore and fallback
    }

    const profile = await this.supabase.getCurrentUserProfile();
    let r: string | null = null;
    if (profile && profile.role) r = String(profile.role).trim();
    // normalize to uppercase for consistent comparisons
    this._role = r ? r.toUpperCase() : null;
    return this._role;
  }

  async isAdmin() {
    const r = await this.loadRole();
    return r === 'ADMIN' || r === 'SUPER_ADMIN';
  }

  async isPair() {
    const r = await this.loadRole();
    return r === 'PAIR' || r === 'PAIR_STAFF';
  }

  async isCreator() {
    const r = await this.loadRole();
    return r === 'CREATOR' || r === 'ORGANIZATION' || r === 'DEPARTMENT' || r === 'ORG';
  }

  async isDepartment() {
    return (await this.loadRole()) === 'DEPARTMENT';
  }

  async canPerformPairActions() {
    return (await this.isPair()) || (await this.isAdmin());
  }

  clearRole() {
    this._role = null;
  }

  // Explicitly set a cached role to avoid repeated lookups after login
  setRole(role: string | null) {
    if (!role) {
      this._role = null;
      return;
    }
    this._role = String(role).trim().toUpperCase();
  }

  // Return cached role (may be null)
  getCachedRole(): string | null {
    return this._role;
  }
}
