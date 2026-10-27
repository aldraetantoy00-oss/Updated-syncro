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
  username = '';
  email = '';
  role = '';
  userId = '';
  avatarUrl = '';
  avatarPreview = '';
  avatarFile: File | null = null;
  departmentName = '';
  backUrl = '/tabs/dashboard';
  profileUrl = '/tabs/profile';
  notificationsUrl = '/tabs/notifications';
  loading = false;
  isSaving = false;
  saveError = '';

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
      this.username = user.username || user.name || '';

      // Get profile information
      const profile = await this.supabaseService.getCurrentUserProfile();
      if (profile) {
        this.fullName = profile.full_name || user.profile_name || user.name || this.email.split('@')[0];
        this.avatarUrl = profile.avatar_url || '';
      } else {
        this.fullName = user.profile_name || user.name || this.email.split('@')[0];
        this.avatarUrl = user.avatar_url || user.profile_photo_path || '';
      }

      const departmentId = user.department_id || profile?.department_id;
      if (departmentId) {
        const { data: department } = await this.supabaseService.supabase
          .from('departments')
          .select('department_name')
          .eq('id', departmentId)
          .maybeSingle();
        this.departmentName = department?.department_name || '';
      }

      // Determine role
      const userRole = await this.authRole.loadRole();
      if (userRole) {
        this.role = userRole.toUpperCase();
      } else {
        this.role = 'ORGANIZATION';
      }
      if (await this.authRole.canPerformPairActions()) {
        this.backUrl = '/pair-tabs/dashboard';
        this.profileUrl = '/pair-tabs/profile';
        this.notificationsUrl = '/pair-tabs/notifications';
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

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.saveError = '';
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.saveError = 'Choose a JPG, PNG, GIF, or WebP image.';
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.saveError = 'Profile photos must be 2 MB or smaller.';
      input.value = '';
      return;
    }

    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = () => this.avatarPreview = String(reader.result || '');
    reader.readAsDataURL(file);
  }

  private async fileToBase64(file: File): Promise<string> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read the selected photo.'));
      reader.readAsDataURL(file);
    });
    return dataUrl.split(',', 2)[1] || '';
  }

  async saveProfile() {
    this.saveError = '';
    if (!this.fullName.trim() || !this.username.trim() || !this.email.trim()) {
      this.saveError = 'Display name, username, and email are required.';
      return;
    }

    this.isSaving = true;
    try {
      const result = await this.supabaseService.updateProfile(this.userId, {
        profileName: this.fullName.trim(),
        username: this.username.trim(),
        email: this.email.trim(),
        ...(this.avatarFile ? {
          avatarBase64: await this.fileToBase64(this.avatarFile),
          avatarContentType: this.avatarFile.type
        } : {})
      });
      if (result.error) throw result.error;

      const user = result.data.user;
      this.fullName = user.profile_name || user.name || this.fullName;
      this.username = user.username || user.name || this.username;
      this.email = user.email || this.email;
      this.avatarUrl = user.avatar_url || this.avatarUrl;
      this.avatarPreview = '';
      this.avatarFile = null;
      const alert = await this.alertCtrl.create({
        header: 'Saved',
        message: 'Your profile has been updated.',
        buttons: ['OK']
      });
      await alert.present();
    } catch (error: any) {
      this.saveError = error?.message || 'Could not save your profile. Please try again.';
    } finally {
      this.isSaving = false;
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
    this.router.navigateByUrl(`/change-password?returnUrl=${encodeURIComponent(this.profileUrl)}`);
  }
}
