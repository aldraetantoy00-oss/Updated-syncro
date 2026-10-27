import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';
import { AuthRoleService } from '../../services/auth-role.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.page.html',
  styleUrls: ['./change-password.page.scss'],
  standalone: false,
})
export class ChangePasswordPage implements OnInit {

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  isSubmitting = false;

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  backUrl = '/tabs/dashboard';
  returnUrl = '/tabs/profile';
  notificationsUrl = '/tabs/notifications';

  constructor(
    private supabaseService: SupabaseService,
    private authRole: AuthRoleService,
    private route: ActivatedRoute,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    const requestedReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (requestedReturnUrl === '/tabs/profile' || requestedReturnUrl === '/pair-tabs/profile') {
      this.returnUrl = requestedReturnUrl;
    }
    if (await this.authRole.canPerformPairActions()) {
      this.backUrl = '/pair-tabs/dashboard';
      this.notificationsUrl = '/pair-tabs/notifications';
      if (this.returnUrl === '/tabs/profile') this.returnUrl = '/pair-tabs/profile';
    }
  }

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

    if (this.newPassword.length < 8) {
      const alert = await this.alertCtrl.create({
        header: 'Validation Error',
        message: 'New password must be at least 8 characters long',
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

      const { error } = await this.supabaseService.changePassword(this.currentPassword, this.newPassword);
      if (error) throw error;

      await loading.dismiss();

      const successAlert = await this.alertCtrl.create({
        header: 'Success',
        message: 'Password changed successfully',
        buttons: [
          {
            text: 'OK',
            handler: () => {
              this.router.navigateByUrl(this.returnUrl);
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
    this.router.navigateByUrl(this.returnUrl);
  }
}
