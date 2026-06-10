import { Component } from '@angular/core';
import {
  NavController,
  LoadingController
} from '@ionic/angular';

import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-submit',
  templateUrl: './submit.page.html',
  styleUrls: ['./submit.page.scss'],
  standalone: false,
})
export class SubmitPage {

  content = '';

  links: string[] = [''];

  images: File[] = [];

  imagePreviews: string[] = [];
  isSubmitting = false;

  constructor(
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private supabaseService: SupabaseService
  ) {}

  addLink() {
    this.links.push('');
  }

  removeLink(i: number) {
    this.links.splice(i, 1);
  }

  onFileSelected(event: any) {

    const files =
      Array.from(event.target.files);

    this.images = files as File[];

    this.imagePreviews = [];

    files.forEach((file: any) => {

      const reader = new FileReader();

      reader.onload = (e: any) => {

        this.imagePreviews.push(
          e.target.result
        );

      };

      reader.readAsDataURL(file);

    });
  }

  async submit() {

    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const loading = await this.loadingCtrl.create({ message: 'Submitting...' });
    await loading.present();

    try {

      const cleanLinks =
        this.links.filter(

          link => link.trim() !== ''

        );

      // Get numeric application profile id (if available). If not, omit user_id to avoid type mismatch.
      const appUserId = await this.supabaseService.getAppUserId();
      const authUser = await this.supabaseService.getUser();

      // INSERT SUBMISSION
      // build payload and only include numeric user_id when available (prevents bigint errors)
      const payload: any = {
        original_caption: this.content,
        links: cleanLinks,
        media_paths: this.imagePreviews,
        status: 'pending',
        workflow_status: 'submitted'
      };
      if (appUserId !== null) payload.user_id = appUserId;

      let data: any = null;
      let error: any = null;

      const userId = authUser && authUser.id ? Number(authUser.id) : null;


      try {
        // ensure payload uses numeric user id when available
        if (userId !== null && !Number.isNaN(userId)) payload.user_id = userId;
        const res = await this.supabaseService.supabase.from('submissions').insert([payload]);
        data = (res as any).data;
        error = (res as any).error;
        console.log('DEBUG: submission insert ->', { data, error });
      } catch (e: any) {
        console.error('Submission insert threw:', e);
        // surface as error to outer catch
        throw e;
      }

      if (data === null && error === null) {
        console.warn('Ambiguous submission response: both data and error are null.');
      }

      // ERROR
      if (error) {

        throw error;

      }

      // INSERT NOTIFICATION
        try {
          const res2 = await this.supabaseService.supabase.from('notifications').insert([
            {
              id: crypto.randomUUID(),
              type: 'App\\Notifications\\SubmissionQueuedForReview',
              notifiable_type: 'App\\Models\\User',
              ...(appUserId !== null ? { notifiable_id: appUserId } : {}),
              data: JSON.stringify({ title: 'New submission to review', message: 'A new submission was added.' }),
              created_at: new Date(),
              updated_at: new Date()
            }
          ]);
          const notifData = (res2 as any).data;
          const notifError = (res2 as any).error;
          console.log('DEBUG: notification insert ->', { notifData, notifError });
          if (notifError) {
            console.error('Notification error details:', {
              status: notifError?.status,
              message: notifError?.message,
              details: notifError?.details,
              hint: notifError?.hint
            });
          }
        } catch (e: any) {
          console.error('Notification insert threw:', e);
        }

      await loading.dismiss();

      // RESET
      this.content = '';

      this.links = [''];

      this.images = [];

      this.imagePreviews = [];

      alert('Submission successful');

      // REDIRECT
      this.navCtrl.navigateRoot('/tabs/dashboard');

    } catch (err) {

      await loading.dismiss();
      console.error(err);
      alert('Submit failed');

    }
    finally {
      this.isSubmitting = false;
    }
  }
}