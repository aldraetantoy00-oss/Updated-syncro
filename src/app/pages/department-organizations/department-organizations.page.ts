import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { EnhancePage } from '../enhance/enhance.page';

interface DepartmentOrganization {
  id: string | number;
  profile_name: string | null;
  name: string | null;
  username: string | null;
  email: string | null;
  submissions: DepartmentSubmission[];
}

interface DepartmentSubmission {
  id: string | number;
  original_caption: string | null;
  enhanced_caption: string | null;
  status: string | null;
  workflow_status: string | null;
  created_at: string | null;
}

@Component({
  selector: 'app-department-organizations',
  templateUrl: './department-organizations.page.html',
  styleUrls: ['./department-organizations.page.scss'],
  standalone: false
})
export class DepartmentOrganizationsPage {
  organizations: DepartmentOrganization[] = [];
  searchQuery = '';
  loading = false;
  error = '';

  constructor(
    private supabaseService: SupabaseService,
    private modalCtrl: ModalController,
    private router: Router
  ) {}

  ionViewWillEnter() {
    this.loadOrganizations();
  }

  get filteredOrganizations(): DepartmentOrganization[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.organizations;
    return this.organizations.filter((organization) =>
      [
        organization.profile_name,
        organization.name,
        organization.username,
        organization.email,
        organization.submissions.map((submission) =>
          `${submission.original_caption || ''} ${submission.enhanced_caption || ''}`
        ).join(' ')
      ].some((value) => String(value || '').toLowerCase().includes(query))
    );
  }

  async loadOrganizations() {
    this.loading = true;
    this.error = '';
    const { data, error } = await this.supabaseService.getDepartmentOrganizations();
    if (error) {
      console.error('Could not load department organizations:', error);
      this.organizations = [];
      this.error = error.message || 'Could not load organizations. Please try again.';
    } else {
      this.organizations = data || [];
    }
    this.loading = false;
  }

  organizationName(organization: DepartmentOrganization): string {
    return organization.profile_name || organization.name || organization.username || 'Unnamed organization';
  }

  submissionStatus(submission: DepartmentSubmission): string {
    const workflowStatus = String(submission.workflow_status || '').toLowerCase();
    if (workflowStatus === 'rejected') return workflowStatus;
    return String(submission.status || workflowStatus || 'unknown').toLowerCase();
  }

  submissionStatusLabel(submission: DepartmentSubmission): string {
    const status = this.submissionStatus(submission);
    if (status === 'in_review' || status === 'submitted') return 'In review';
    if (status === 'approved' || status === 'completed') return 'Approved';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  }

  submissionStatusColor(submission: DepartmentSubmission): string {
    const status = this.submissionStatus(submission);
    if (status === 'pending') return 'warning';
    if (status === 'in_review' || status === 'submitted') return 'primary';
    if (status === 'approved' || status === 'completed') return 'success';
    if (status === 'rejected') return 'danger';
    if (status === 'posted') return 'secondary';
    return 'medium';
  }

  canReviewSubmission(submission: DepartmentSubmission): boolean {
    return !['approved', 'completed', 'posted'].includes(this.submissionStatus(submission));
  }

  viewSubmission(submission: DepartmentSubmission) {
    this.router.navigateByUrl(`/submission-details?id=${submission.id}`);
  }

  async reviewSubmission(
    organization: DepartmentOrganization,
    submission: DepartmentSubmission,
    initialDecision: 'approve' | 'reject' = 'approve'
  ) {
    const modal = await this.modalCtrl.create({
      component: EnhancePage,
      componentProps: {
        post: submission,
        departmentMode: true,
        departmentInitialDecision: initialDecision,
        organizationName: this.organizationName(organization)
      }
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.refreshed) await this.loadOrganizations();
  }
}
