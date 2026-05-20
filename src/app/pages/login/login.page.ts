import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {

  email = '';
  password = '';

  constructor(
    private router: Router,
    private loadingCtrl: LoadingController,
    private supabaseService: SupabaseService
  ) {}

  // LOGIN
  async login() {

    // VALIDATION
    if (!this.email || !this.password) {

      alert('Please enter email and password');

      return;
    }

    // LOADING
    const loading = await this.loadingCtrl.create({
      message: 'Signing in...'
    });

    await loading.present();

    try {

      // SUPABASE LOGIN
      const { data, error } =
        await this.supabaseService.supabase.auth.signInWithPassword({

          email: this.email,

          password: this.password

        });

      loading.dismiss();

      console .log('SUPABASE LOGIN DATA:', data);
      console.log('SUPABASE LOGIN ERROR:', error);

      if (error) {

        alert(error.message);

      } else {

      this.router.navigateByUrl('/tabs/dashboard');
      }

    } catch (err) {

      loading.dismiss();

      console.error('LOGIN ERROR:', err);

      alert('An error occurred during login. Please try again.');

    }
  }
}