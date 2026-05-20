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

      // CREATE AUTH ACCOUNT
      const { data, error } =
        await this.supabaseService.supabase.auth.signUp({

          email: this.email,

          password: this.password

        });

      if (error) {

        loading.dismiss();

        alert(error.message);

        return;
      }

      // INSERT USER DATA
      await this.supabaseService.supabase
        .from('users')
        .insert([{

          id: data.user?.id,

          username: this.username,

          email: this.email,

          role: 'org'

        }]);

      loading.dismiss();

      alert('Account created successfully');

      this.router.navigateByUrl('/login');

    } catch(err) {

      loading.dismiss();

      alert('Something went wrong');

      console.log(err);

    }
  }
}