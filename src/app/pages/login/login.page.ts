import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';
import { AuthRoleService } from '../../services/auth-role.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {

  email = '';
  password = '';
  isLoggingIn = false;
  accountRequestSubmitted = false;

  constructor(
    private router: Router,
    private loadingCtrl: LoadingController,
    private supabaseService: SupabaseService,
    private authRole: AuthRoleService
  ) {}

  ngOnInit() {
    try {
      this.accountRequestSubmitted = localStorage.getItem('accountRequestSubmitted') === 'true';
      localStorage.removeItem('accountRequestSubmitted');
    } catch (e) {}
  }

  // LOGIN
  async login() {

    if (this.isLoggingIn) return;
    this.isLoggingIn = true;

    // ensure we don't allow rapid double-clicks (secondary guard)
    const startTs = Date.now();

    // Trim and normalize inputs
    const email = (this.email || '').trim().toLowerCase();
    const password = this.password || '';

    // VALIDATION
    if (!email || !password) {
      alert('Please enter email and password');
      this.isLoggingIn = false;
      return;
    }

    // LOADING
    const loading = await this.loadingCtrl.create({
      message: 'Signing in...'
    });

    await loading.present();

    try {
      console.log('Login started for', email);

      // Use users-table login (serialized, bcrypt verification in service)
      try {
        const result: any = await this.supabaseService.loginWithUsersTable(email, password);
        if (result?.error) {
          console.warn('Login failed:', result.error);
          alert((result.error && result.error.message) ? result.error.message : 'Invalid credentials');
          try { await loading.dismiss(); } catch (e) {}
          this.isLoggingIn = false;
          return;
        }

        const session = result?.session ?? null;
        if (session) {
          try { this.authRole.setRole((session as any).role || null); } catch (e) {}
          try { await loading.dismiss(); } catch (e) {}
          this.isLoggingIn = false;
          if (await this.authRole.isPair()) {
            await this.router.navigateByUrl('/pair-tabs/dashboard', { replaceUrl: true });
          } else {
            await this.router.navigateByUrl('/tabs/dashboard', { replaceUrl: true });
          }
          return;
        }

        alert('Invalid credentials');
        try { await loading.dismiss(); } catch (e) {}
        this.isLoggingIn = false;
        return;
      } catch (err: any) {
        console.error('LOGIN ERROR (users-table):', err);
        alert(err?.message || 'Login failed. Please try again.');
        try { await loading.dismiss(); } catch (e) {}
        this.isLoggingIn = false;
        return;
      }

    } catch (err) {
      console.error('LOGIN ERROR (outer):', err);
      alert('An error occurred during login. Please try again.');
    } finally {
      try {
        await loading.dismiss();
      } catch (e) {
        // ignore dismiss errors
      }
      // ensure loading state cleared (other paths also clear it)
      this.isLoggingIn = false;
    }
  }

  // Navigate based on user role
  private async navigateBasedOnRole() {
    try {
      // Prefer cached role to avoid extra lookups
      const cached = this.authRole.getCachedRole();
      if (cached) {
        if (cached === 'PAIR' || cached === 'PAIR_STAFF') {
          console.log('👮 PAIR user detected (cached), navigating to PAIR tabs');
          this.router.navigateByUrl('/pair-tabs/dashboard', { replaceUrl: true });
          return;
        } else {
          console.log('🏢 Organization user detected (cached), navigating to organization tabs');
          this.router.navigateByUrl('/tabs/dashboard', { replaceUrl: true });
          return;
        }
      }

      // Fallback: perform role check which will query if needed
      const isPair = await this.authRole.isPair();
      if (isPair) {
        console.log('👮 PAIR user detected, navigating to PAIR tabs');
        this.router.navigateByUrl('/pair-tabs/dashboard', { replaceUrl: true });
      } else {
        console.log('🏢 Organization user detected, navigating to organization tabs');
        this.router.navigateByUrl('/tabs/dashboard', { replaceUrl: true });
      }
    } catch (e) {
      console.error('Error determining user role, defaulting to organization dashboard:', e);
      this.router.navigateByUrl('/tabs/dashboard', { replaceUrl: true });
    }
  }
}