import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { EnhancePage } from '../enhance/enhance.page';

@Component({
  selector: 'app-pair-all-submissions',
  templateUrl: './pair-all-submissions.page.html',
  styleUrls: ['./pair-all-submissions.page.scss'],
  standalone: false
})
export class PairAllSubmissionsPage implements OnInit {
  submissions: any[] = [];
  filteredSubmissions: any[] = [];
  searchQuery = '';
  filterStatus = '';
  loading = true;
  error = '';

  constructor(
    private supabaseService: SupabaseService,
    private modalCtrl: ModalController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadSubmissions();
  }

  async loadSubmissions() {
    this.loading = true;
    this.error = '';
    const { data, error } = await this.supabaseService.supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      this.error = 'Could not load submissions. Check your connection and try again.';
      this.submissions = [];
      this.filteredSubmissions = [];
      this.loading = false;
      return;
    }

    this.submissions = data || [];
    this.applyFilters();
    this.loading = false;
  }

  applyFilters() {
    const query = this.searchQuery.trim().toLowerCase();
    this.filteredSubmissions = this.submissions.filter((submission) => {
      const status = String(submission.status || submission.workflow_status || '').toLowerCase();
      if (this.filterStatus && status !== this.filterStatus) return false;
      if (!query) return true;
      const content = [
        submission.original_caption,
        submission.enhanced_caption,
        submission.org_name,
        submission.user_id
      ].join(' ').toLowerCase();
      return content.includes(query);
    });
  }

  statusLabel(submission: any) {
    const status = String(submission.status || submission.workflow_status || '').toLowerCase();
    if (status === 'submitted' || status === 'in_review') return 'In review';
    if (status === 'completed') return 'Approved';
    return status ? status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ') : 'Unknown';
  }

  statusColor(submission: any) {
    const status = String(submission.status || submission.workflow_status || '').toLowerCase();
    if (status === 'pending') return 'warning';
    if (status === 'submitted' || status === 'in_review') return 'primary';
    if (status === 'approved' || status === 'completed') return 'success';
    if (status === 'rejected') return 'danger';
    if (status === 'posted') return 'tertiary';
    return 'medium';
  }

  viewDetails(submission: any) {
    this.router.navigateByUrl(`/submission-details?id=${submission.id}`);
  }

  async openEnhance(submission: any) {
    const modal = await this.modalCtrl.create({
      component: EnhancePage,
      componentProps: { post: submission }
    });
    await modal.present();
    await modal.onDidDismiss();
    await this.loadSubmissions();
  }

  async reject(submission: any) {
    const confirmed = confirm('Reject this submission?');
    if (!confirmed) return;
    const { error } = await this.supabaseService.supabase
      .from('submissions')
      .update({ status: 'rejected', workflow_status: 'rejected' })
      .eq('id', submission.id);
    if (error) {
      this.error = 'Could not reject this submission.';
      return;
    }
    await this.loadSubmissions();
  }
}