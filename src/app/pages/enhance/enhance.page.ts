import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';
import { AuthRoleService } from '../../services/auth-role.service';

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

  feedback = '';

  decision = 'approve';

  allowPairActions = false;

  isSubmitting = false;

  showPostedOption = false;

  constructor(
    private modalCtrl: ModalController,
    private supabaseService: SupabaseService
    , private authRole: AuthRoleService
  ) {}

  ngOnInit() {

    // SHOW ORIGINAL CAPTION
    this.enhancedText =
      this.post.original_caption || '';

    // If submission is already approved, show option to post it
    this.showPostedOption = this.post.status === 'approved' || this.post.workflow_status === 'approved';

    // If already approved and showing enhanced, use that
    if (this.showPostedOption && this.post.enhanced_caption) {
      this.enhancedText = this.post.enhanced_caption;
    }

    // determine if current user may run PAIR/admin actions (generate/preview/approve)
    this.authRole.canPerformPairActions().then(flag => {
      this.allowPairActions = !!flag;
    }).catch(() => { this.allowPairActions = false; });

  }

  close() {
    this.modalCtrl.dismiss();
  }

  // MOCK AI
  generateAI() {

    this.enhancedText = `✨ ${this.post.original_caption}

This version is more engaging, professional, and polished.`;

  }

  // SUBMIT REVIEW (Approve, Reject, or Mark as Posted)
  async submitReview() {

    // Validation
    if (!this.allowPairActions) {
      alert('This action is restricted.');
      return;
    }

    if (this.decision === 'approve' && this.enhancedText.trim().length < 10) {
      alert('Enhanced caption must be at least 10 characters');
      return;
    }

    this.isSubmitting = true;

    try {
      // Prepare update object
      const updateObj: any = {
        pair_feedback: this.feedback,
        reviewed_at: new Date()
      };

      // Handle different decisions
      if (this.decision === 'approve') {
        updateObj.enhanced_caption = this.enhancedText;
        updateObj.status = 'approved';
        updateObj.workflow_status = 'approved';
      } else if (this.decision === 'reject') {
        updateObj.status = 'pending';
        updateObj.workflow_status = 'rejected';
      } else if (this.decision === 'posted') {
        // Mark as posted (already approved)
        updateObj.status = 'posted';
        updateObj.workflow_status = 'posted';
        updateObj.posted_at = new Date();
      }

      // Update submission
      const { data, error } =
        await this.supabaseService.supabase
          .from('submissions')
          .update(updateObj)
          .eq('id', this.post.id);

      console.log('✅ Review submitted:', data);
      console.log('Review error:', error);

      if (error) {
        throw error;
      }

      // Get user ID for notification
      const user = await this.supabaseService.getUser();
      const notifiable_id = this.post.user_id || user?.id || 1;

      // INSERT NOTIFICATION
      let notifType = 'App\\Notifications\\SubmissionApproved';
      let notifMessage = 'Your submission was approved by PAIR!';
      let notifTitle = 'Submission Approved';

      if (this.decision === 'reject') {
        notifType = 'App\\Notifications\\SubmissionRejected';
        notifMessage = 'Your submission needs revisions. Please check feedback.';
        notifTitle = 'Submission Rejected';
      } else if (this.decision === 'posted') {
        notifType = 'App\\Notifications\\SubmissionPosted';
        notifMessage = 'Your submission has been posted!';
        notifTitle = 'Submission Posted';
      }

      const { error: notifError } =
        await this.supabaseService.supabase
          .from('notifications')
          .insert([{
            id: crypto.randomUUID(),
            type: notifType,
            notifiable_type: 'App\\Models\\User',
            notifiable_id: notifiable_id,
            data: JSON.stringify({
              title: notifTitle,
              message: notifMessage,
              submission_id: this.post.id
            }),
            created_at: new Date(),
            updated_at: new Date()
          }]);

      console.log('✅ Notification sent');
      if (notifError) console.warn('Notification error:', notifError);

      this.isSubmitting = false;

      // Show success and close
      alert(`Submission ${this.decision === 'approve' ? 'approved' : this.decision === 'reject' ? 'rejected' : 'posted'} successfully!`);
      this.modalCtrl.dismiss({ refreshed: true });

    } catch (e: any) {
      this.isSubmitting = false;
      console.error('Review submission error:', e);
      alert('Failed to submit review: ' + (e?.message || 'Unknown error'));
    }
  }
}