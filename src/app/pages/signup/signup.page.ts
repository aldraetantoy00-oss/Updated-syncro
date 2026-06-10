import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';



@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: false
})
export class SignupPage {

  username = '';
  email = '';
  password = '';
  confirmPassword = '';

  constructor(
    private router: Router,
    private loadingCtrl: LoadingController,
    private supabaseService: SupabaseService
  ) {}

  async register() {

    // VALIDATION
    if (
      !this.username ||
      !this.email ||
      !this.password ||
      !this.confirmPassword
    ) {

      alert('Please fill all fields');

      return;
    }

    if (this.password !== this.confirmPassword) {

      alert('Passwords do not match');

      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Creating account...'
    });

    await loading.present();

    try {

      // Create user in `users` table
      const res: any = await this.supabaseService.signUpWithUsersTable({
        username: this.username,
        email: this.email,
        password: this.password,
        role: 'org'
      });

      const data = res?.data ?? null;
      const error = res?.error ?? null;

      if (error) {
        loading.dismiss();
        alert((error as any)?.message ? (error as any).message : String(error) || 'Failed to create account');
        return;
      }

      loading.dismiss();
      alert('Account created successfully');
      this.router.navigateByUrl('/login', { replaceUrl: true });

    } catch(err) {

      loading.dismiss();

      alert('Something went wrong');

      console.log(err);

    }
  }
}