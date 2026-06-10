import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { SupabaseService } from '../../services/supabase';
import { AuthRoleService } from '../../services/auth-role.service';

@Component({
  selector: 'app-submission-details',
  templateUrl: './submission-details.page.html',
  styleUrls: ['./submission-details.page.scss'],
  standalone: false,
})
export class SubmissionDetailsPage implements OnInit {

  submission: any = null;
  loading = true;
  submissionId: string | null = null;
  isPair = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private supabaseService: SupabaseService,
    private authRole: AuthRoleService
  ) {}

  ngOnInit() {
    this.loadSubmission();
    this.checkRole();
  }

  async checkRole() {
    try {
      this.isPair = await this.authRole.isPair();
    } catch (e) {
      this.isPair = false;
    }
  }

  async loadSubmission() {
    try {
      this.loading = true;

      // Get submission ID from route params or query params
      this.submissionId = this.route.snapshot.paramMap.get('id');
      if (!this.submissionId) {
        this.submissionId = this.route.snapshot.queryParamMap.get('id');
      }

      if (!this.submissionId) {
        this.router.navigateByUrl('/all-submissions');
        return;
      }

      // Fetch submission details
      const { data, error } = await this.supabaseService.supabase
        .from('submissions')
        .select('*')
        .eq('id', this.submissionId)
        .single();

      if (error) {
        console.error('Error loading submission:', error);
        throw error;
      }

      if (!data) {
        console.warn('Submission not found');
        this.router.navigateByUrl('/all-submissions');
        return;
      }

      // Format submission
      this.submission = {
        ...data,
        created_at: data.created_at ? new Date(data.created_at) : null,
        reviewed_at: data.reviewed_at ? new Date(data.reviewed_at) : null,
        enhanced_at: data.enhanced_at ? new Date(data.enhanced_at) : null
      };

      console.log('📄 Submission loaded:', this.submission);
      this.loading = false;

    } catch (e: any) {
      console.error('Error loading submission details:', e);
      this.loading = false;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_review':
        return 'primary';
      case 'approved':
      case 'completed':
        return 'success';
      case 'posted':
        return 'secondary';
      default:
        return 'medium';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'in_review':
        return 'eye-outline';
      case 'approved':
      case 'completed':
        return 'checkmark-circle-outline';
      case 'posted':
        return 'cloud-upload-outline';
      default:
        return 'help-circle-outline';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'in_review':
        return 'In Review';
      case 'approved':
      case 'completed':
        return 'Approved';
      case 'posted':
        return 'Posted';
      default:
        return 'Unknown';
    }
  }

  goBack() {
    if (this.isPair) {
      this.router.navigateByUrl('/pair-tabs/queue', { replaceUrl: true });
    } else {
      this.router.navigateByUrl('/all-submissions', { replaceUrl: true });
    }
  }
}
