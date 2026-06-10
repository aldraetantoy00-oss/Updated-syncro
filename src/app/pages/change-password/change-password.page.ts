import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.page.html',
  styleUrls: ['./change-password.page.scss'],
  standalone: false,
})
export class ChangePasswordPage {

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  isSubmitting = false;

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {}

  togglePasswordVisibility(field: string) {
    if (field === 'current') {
      this.showCurrentPassword = !this.showCurrentPassword;
    } else if (field === 'new') {
      this.showNewPassword = !this.showNewPassword;
    } else if (field === 'confirm') {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  async changePassword() {
    // Validation
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      const alert = await this.alertCtrl.create({
        header: 'Validation Error',
        message: 'Please fill in all fields',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    if (this.newPassword.length < 6) {
      const alert = await this.alertCtrl.create({
        header: 'Validation Error',
        message: 'New password must be at least 6 characters long',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      const alert = await this.alertCtrl.create({
        header: 'Validation Error',
        message: 'New password and confirmation do not match',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    if (this.currentPassword === this.newPassword) {
      const alert = await this.alertCtrl.create({
        header: 'Validation Error',
        message: 'New password must be different from current password',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    this.isSubmitting = true;

    const loading = await this.loadingCtrl.create({
      message: 'Changing password...'
    });
    await loading.present();

    try {
      // Get current user
      const user = await this.supabaseService.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify current password via users table auth (local bcrypt check)
      try {
        const res: any = await this.supabaseService.loginWithUsersTable(user.email || '', this.currentPassword);
        if (res?.error || !res?.session) throw new Error('Current password is incorrect');
      } catch (e) {
        throw new Error('Current password is incorrect');
      }

      // Hash and update password in users table
      let hash = null;
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const bcryptModule: any = (await import('bcryptjs'))?.default ?? (await import('bcryptjs'));
        hash = await bcryptModule.hash(this.newPassword, 10);
      } catch (e) {
        console.warn('bcryptjs not available, password won\'t be hashed in database');
      }

      const updateObj: any = {};
      if (hash) {
        updateObj.password = hash;
      } else {
        updateObj.password = this.newPassword;
      }

      const { error: dbError } = await this.supabaseService.supabase
        .from('users')
        .update(updateObj)
        .eq('id', user.id);

      if (dbError) {
        throw dbError;
      }

      await loading.dismiss();

      const successAlert = await this.alertCtrl.create({
        header: 'Success',
        message: 'Password changed successfully',
        buttons: [
          {
            text: 'OK',
            handler: () => {
              this.router.navigateByUrl('/profile');
            }
          }
        ]
      });
      await successAlert.present();

    } catch (error: any) {
      await loading.dismiss();
      this.isSubmitting = false;

      const errorAlert = await this.alertCtrl.create({
        header: 'Error',
        message: error?.message || 'Failed to change password',
        buttons: ['OK']
      });
      await errorAlert.present();
    }
  }

  goBack() {
    this.router.navigateByUrl('/profile');
  }
}
