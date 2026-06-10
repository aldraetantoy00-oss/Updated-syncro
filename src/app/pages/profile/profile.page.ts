import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';
import { AuthRoleService } from '../../services/auth-role.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit {

  fullName = '';
  email = '';
  role = '';
  userId = '';
  avatarUrl = '';
  loading = false;

  constructor(
    private supabaseService: SupabaseService,
    private authRole: AuthRoleService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  async loadUserProfile() {
    try {
      this.loading = true;
      
      const user = await this.supabaseService.getUser();
      if (!user) {
        this.router.navigateByUrl('/login', { replaceUrl: true });
        return;
      }

      this.userId = user.id || '';
      this.email = user.email || '';

      // Get profile information
      const profile = await this.supabaseService.getCurrentUserProfile();
      if (profile) {
        this.fullName = profile.full_name || profile.name || this.email.split('@')[0];
        this.avatarUrl = profile.avatar_url || '';
      } else {
        this.fullName = this.email.split('@')[0];
      }

      // Determine role
      const userRole = await this.authRole.loadRole();
      if (userRole) {
        this.role = userRole.toUpperCase();
      } else {
        this.role = 'ORGANIZATION';
      }

      this.loading = false;
    } catch (e) {
      console.error('Error loading profile', e);
      this.loading = false;
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'Failed to load profile',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Logout',
      message: 'Are you sure you want to log out?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          role: 'destructive',
          handler: async () => {
              try {
              try { this.authRole.clearRole(); } catch (e) {}
              this.supabaseService.signOutLocal();
              try { localStorage.clear(); } catch (e) {}
              this.router.navigateByUrl('/login', { replaceUrl: true });
            } catch (e) {
              console.error('Logout error', e);
              const errorAlert = await this.alertCtrl.create({
                header: 'Error',
                message: 'Failed to logout',
                buttons: ['OK']
              });
              await errorAlert.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async changePassword() {
    this.router.navigateByUrl('/change-password');
  }
}
