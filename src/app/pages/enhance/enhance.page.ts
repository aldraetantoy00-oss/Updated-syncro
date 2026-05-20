import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-enhance',
  templateUrl: './enhance.page.html',
  styleUrls: ['./enhance.page.scss'],
  standalone: false
})
export class EnhancePage {

  @Input() post: any;

  selectedProvider = 'openai';

  tone = 'formal';

  enhancedText = '';

  comments = '';

  constructor(
    private modalCtrl: ModalController,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit() {

    // SHOW ORIGINAL CAPTION
    this.enhancedText =
      this.post.original_caption || '';

  }

  close() {
    this.modalCtrl.dismiss();
  }

  // MOCK AI
  generateAI() {

    this.enhancedText = `✨ ${this.post.original_caption}

This version is more engaging, professional, and polished.`;

  }

  // SAVE
  async preview() {

    // UPDATE SUBMISSION
    const { data, error } =
      await this.supabaseService.supabase
        .from('submissions')
        .update({

          enhanced_caption: this.enhancedText,

          pair_feedback: this.comments,

          status: 'approved',

          workflow_status: 'approved',

          enhanced_at: new Date()

        })
        .eq('id', this.post.id);

    console.log(data);
    console.log(error);

    // ERROR
    if (error) {

      alert('Failed to update');

      return;
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
        'App\\Notifications\\EnhancementReadyForReview',

      notifiable_type:
        'App\\Models\\User',

      notifiable_id: 1,

      data: JSON.stringify({

        title:
          'Caption ready for review',

        message:
          'PAIR approved a submission.'

      }),

      created_at: new Date(),

      updated_at: new Date()

    }
  ]);

    console.log('NOTIF DATA:', notifData);
    console.log('NOTIF ERROR:', notifError);

    // CLOSE
    this.modalCtrl.dismiss({
      refreshed: true
    });

  }
}