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
  @Input() departmentMode = false;
  @Input() departmentInitialDecision: 'approve' | 'reject' = 'approve';

  selectedProvider = 'openai';

  tone = 'formal';

  enhancedText = '';

  feedback = '';

  decision = 'approve';

  allowPairActions = false;

  allowDepartmentActions = false;

  isSubmitting = false;

  showPostedOption = false;

  constructor(
    private modalCtrl: ModalController,
    private supabaseService: SupabaseService
    , private authRole: AuthRoleService
  ) {}

  ngOnInit() {
    if (this.departmentMode) this.decision = this.departmentInitialDecision;

    // SHOW ORIGINAL CAPTION
    this.enhancedText =
      this.post.original_caption || '';

    // If submission is already approved, show option to post it
    this.showPostedOption = this.post.status === 'approved' || this.post.workflow_status === 'approved';

    // If already approved and showing enhanced, use that
    if (this.showPostedOption && this.post.enhanced_caption) {
      this.enhancedText = this.post.enhanced_caption;
    }

    this.authRole.canPerformPairActions().then(flag => {
      this.allowPairActions = !!flag;
    }).catch(() => { this.allowPairActions = false; });
    this.authRole.isDepartment().then(flag => {
      this.allowDepartmentActions = this.departmentMode && !!flag;
    }).catch(() => { this.allowDepartmentActions = false; });

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
    if (!this.allowPairActions && !this.allowDepartmentActions) {
      alert('This action is restricted.');
      return;
    }

    if ((this.decision === 'approve' || this.allowDepartmentActions) && this.enhancedText.trim().length < 10) {
      alert('Enhanced caption must be at least 10 characters');
      return;
    }

    this.isSubmitting = true;

    try {
      if (this.allowDepartmentActions) {
        const departmentDecision = this.decision === 'reject' ? 'rejected' : 'approved';
        const result = await this.supabaseService.reviewDepartmentSubmission(
          this.post.id,
          this.enhancedText,
          this.feedback,
          departmentDecision
        );
        if (result.error) {
          throw result.error;
        }

        const notificationResult = await this.supabaseService.notifySubmissionStatus(this.post.id, departmentDecision);
        if (notificationResult.error) {
          console.error('Department review was saved, but the organization could not be notified:', notificationResult.error);
        }

        this.isSubmitting = false;
        alert(`Submission ${departmentDecision} by the department successfully!`);
        this.modalCtrl.dismiss({ refreshed: true });
        return;
      }

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

      const decision = this.decision === 'reject'
        ? 'rejected'
        : this.decision === 'posted'
          ? 'posted'
          : 'approved';
      const notificationResult = await this.supabaseService.notifySubmissionStatus(this.post.id, decision);
      if (notificationResult.error) {
        console.error('Review was saved, but the organization could not be notified:', notificationResult.error);
      }

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