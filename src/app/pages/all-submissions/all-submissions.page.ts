import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';
import { EnhancePage } from '../enhance/enhance.page';
import { AuthRoleService } from '../../services/auth-role.service';

@Component({
  selector: 'app-all-submissions',
  templateUrl: './all-submissions.page.html',
  styleUrls: ['./all-submissions.page.scss'],
  standalone: false,
})
export class AllSubmissionsPage {

  posts: any[] = [];
  filteredPosts: any[] = [];
  loading = false;
  loadError = '';
  filterStatus = '';
  searchQuery = '';
  showFilters = false;
  role: string | null = null;
  canReview = false;

  constructor(
    private supabaseService: SupabaseService,
    private modalCtrl: ModalController,
    private router: Router,
    public authRole: AuthRoleService
  ) {}

  ionViewWillEnter() {
    this.getPosts();
  }

  async getPosts() {
    const FILE_ID = 'src/app/pages/all-submissions/all-submissions.page.ts:getPosts';
    this.loading = true;
    this.loadError = '';

    try {
      const role = await this.authRole.loadRole().catch(() => null);
      this.role = role;
      this.canReview = await this.authRole.canPerformPairActions().catch(() => false);

      const res = await this.supabaseService.getSubmissions();

      if (res.error) {
        console.error(FILE_ID, 'query error', res.error);
        this.loadError = res.error.message || 'Could not load submissions. Please try again.';
        this.posts = [];
        this.filteredPosts = [];
        this.applyFilters();
        return;
      }

      this.posts = res.data || [];
      this.filteredPosts = this.posts.slice();
      this.applyFilters();

      if (!this.posts || this.posts.length === 0) {
        console.info(FILE_ID, 'No submissions are available for this account.');
      }

    } catch (err) {
      console.error(FILE_ID, 'unexpected error', err);
      this.loadError = 'Could not load submissions. Please try again.';
      this.posts = [];
      this.filteredPosts = [];
      this.applyFilters();
    } finally {
      this.loading = false;
    }
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  applyFilters() {
    const q = (this.searchQuery || '').toString().trim().toLowerCase();
    const s = (this.filterStatus || '').toString().trim();
    this.filteredPosts = (this.posts || []).filter(p => {
      if (s && this.getStatus(p) !== s) return false;
      if (q) {
        const text = ((p.original_caption || '') + ' ' + (p.enhanced_caption || '') + ' ' + (p.user_id || '')).toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }

  getStatus(post: any): string {
    const workflowStatus = String(post.workflow_status || '').toLowerCase();
    if (workflowStatus === 'rejected') return workflowStatus;
    return String(post.status || workflowStatus).toLowerCase();
  }

  statusLabel(post: any) {
    const st = this.getStatus(post);
    if (!st) return 'Unknown';
    if (st === 'pending') return 'Pending';
    if (st === 'in_review' || st === 'submitted') return 'Review';
    if (st === 'completed' || st === 'approved') return 'Approved';
    if (st === 'rejected') return 'Rejected';
    if (st === 'posted') return 'Posted';
    return st;
  }

  statusColor(post: any) {
    const st = this.getStatus(post);
    if (st === 'pending') return 'warning';
    if (st === 'in_review' || st === 'submitted') return 'primary';
    if (st === 'completed' || st === 'approved') return 'success';
    if (st === 'rejected') return 'danger';
    if (st === 'posted') return 'secondary';
    return 'medium';
  }

  statusClass(post: any) {
    const st = this.getStatus(post);
    if (st === 'pending') return 'pending-line';
    if (st === 'in_review' || st === 'submitted') return 'review-line';
    if (st === 'completed' || st === 'approved') return 'approved-line';
    if (st === 'rejected') return 'rejected-line';
    if (st === 'posted') return 'posted-line';
    return '';
  }

  async reject(post: any) {
    if (!post || !post.id) return;
    const ok = confirm('Reject this submission?');
    if (!ok) return;
    try {
      const { error } = await this.supabaseService.supabase
        .from('submissions')
        .update({ workflow_status: 'rejected', status: 'rejected' })
        .eq('id', post.id);
      if (error) {
        alert('Failed to reject submission');
        return;
      }
      this.getPosts();
    } catch (e) {
      console.error('Reject failed', e);
      alert('Failed to reject submission');
    }
  }

  async openEnhance(post: any) {
    const modal = await this.modalCtrl.create({
      component: EnhancePage,
      componentProps: { post }
    });

    await modal.present();

    modal.onDidDismiss().then(() => {
      this.getPosts();
    });
  }

  viewDetails(post: any) {
    this.router.navigateByUrl(`/submission-details?id=${post.id}`);
  }

}
