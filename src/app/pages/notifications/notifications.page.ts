import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { AuthRoleService } from '../../services/auth-role.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false
})
export class NotificationsPage {

  notifications: any[] = [];
  loading = false;
  loadError = '';

  constructor(
    private supabaseService: SupabaseService,
    private authRole: AuthRoleService,
    private router: Router
  ) {}

  ionViewWillEnter() {
    this.getNotifications();
  }

  async getNotifications() {
    this.loading = true;
    this.loadError = '';

    try {
      const { data, error } = await this.supabaseService.getNotifications();
      if (error) throw error;

      this.notifications = (data || []).map(item => {
        let parsedData: any = {};
        try {
          parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
        } catch (parseError) {
          console.warn('Could not parse notification data', parseError);
        }

        return {
          ...item,
          parsedData: parsedData || {},
          created_at: item.created_at ? new Date(item.created_at) : null
        };
      });
    } catch (error) {
      console.error('Could not load notifications', error);
      this.loadError = error instanceof Error ? error.message : 'Could not load notifications. Please try again.';
      this.notifications = [];
    } finally {
      this.loading = false;
    }
  }

  async openNotification(item: any) {
    if (await this.authRole.isDepartment()) {
      await this.router.navigateByUrl('/department/organizations');
      return;
    }

    const submissionId = item?.parsedData?.submission_id;
    if (submissionId !== null && submissionId !== undefined) {
      await this.router.navigateByUrl(`/submission-details?id=${submissionId}`);
    }
  }
}