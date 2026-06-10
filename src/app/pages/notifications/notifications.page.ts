import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false
})
export class NotificationsPage implements OnInit {

  notifications: any[] = [];

  constructor(
    private supabaseService: SupabaseService
  ) {}

  ngOnInit() {
    this.getNotifications();
  }

  async getNotifications() {

    const appUserId = await this.supabaseService.getAppUserId();
    if (appUserId === null) {
      this.notifications = [];
      return;
    }

    const { data, error } = await this.supabaseService.supabase
      .from('notifications')
      .select('*')
      .eq('notifiable_id', appUserId)
      .order('created_at', { ascending: false });

    console.log(data);
    console.log(error);

    if (data) {

      this.notifications = data.map(item => {

        let parsedData: any = {};

        try {

          parsedData =
            typeof item.data === 'string'
              ? JSON.parse(item.data)
              : item.data;

        } catch (e) {

          parsedData = {};
        }

        return {

          ...item,

          parsedData,

          created_at: item.created_at
            ? new Date(item.created_at)
            : null
        };
      });
    }
  }
}