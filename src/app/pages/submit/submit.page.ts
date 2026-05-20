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

    const loading =
      await this.loadingCtrl.create({

        message: 'Submitting...'

      });

    await loading.present();

    try {

      const cleanLinks =
        this.links.filter(

          link => link.trim() !== ''

        );

      // INSERT SUBMISSION
      const { data, error } =
        await this.supabaseService.supabase
          .from('submissions')
          .insert([
            {

              user_id: 3,

              original_caption:
                this.content,

              links: cleanLinks,

              media_paths:
                this.imagePreviews,

              status: 'pending',

              workflow_status:
                'submitted'

            }
          ]);

      console.log(data);
      console.log(error);

      // ERROR
      if (error) {

        throw error;

      }

      // INSERT NOTIFICATION
      const {
        data: notifData,
        error: notifError
      } =
       await this.supabaseService.supabase
  .from('notifications')
  .insert([
    {

      id: crypto.randomUUID(),

      type:
        'App\\Notifications\\SubmissionQueuedForReview',

      notifiable_type:
        'App\\Models\\User',

      notifiable_id: 1,

      data: JSON.stringify({

        title:
          'New submission to review',

        message:
          'A new submission was added.'

      }),

      created_at: new Date(),

      updated_at: new Date()

    }
  ]);
      console.log(
        'NOTIF DATA:',
        notifData
      );

      console.log(
        'NOTIF ERROR:',
        notifError
      );

      await loading.dismiss();

      // RESET
      this.content = '';

      this.links = [''];

      this.images = [];

      this.imagePreviews = [];

      alert(
        'Submission successful'
      );

      // REDIRECT
      this.navCtrl.navigateRoot(
        '/tabs/dashboard'
      );

    } catch (err) {

      await loading.dismiss();

      console.error(err);

      alert('Submit failed');

    }
  }
}