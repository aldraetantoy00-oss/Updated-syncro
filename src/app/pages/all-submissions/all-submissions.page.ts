import { Component, OnInit } from '@angular/core';
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
export class AllSubmissionsPage implements OnInit {

  posts: any[] = [];
  filteredPosts: any[] = [];
  filterStatus = '';
  searchQuery = '';
  showFilters = false;
  role: string | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private modalCtrl: ModalController,
    private router: Router,
    public authRole: AuthRoleService
  ) {}

  ngOnInit() {
    this.getPosts();
  }

  async getPosts() {
    const FILE_ID = 'src/app/pages/all-submissions/all-submissions.page.ts:getPosts';
    console.log(FILE_ID, 'start');

    try {
      const localUser = await this.supabaseService.getUser().catch(() => null);
      console.log(FILE_ID, 'localUser:', localUser);

      const role = await this.authRole.loadRole().catch(() => null);
      console.log(FILE_ID, 'role:', role);
      this.role = role;

      const appUserId = await this.supabaseService.getAppUserId().catch(() => null);
      console.log(FILE_ID, 'appUserId:', appUserId);

      const workflowStates = ['submitted', 'pending', 'in_review'];
      let res: any;

      if (role === 'PAIR') {
        console.log(FILE_ID, 'role=PAIR — fetching content queue by workflow_status OR status');
        // Try a combined query checking both workflow_status and status fields
        try {
          res = await this.supabaseService.supabase
            .from('submissions')
            .select('*')
            .or(`workflow_status.in.(${workflowStates.join(',')}) , status.in.(${workflowStates.join(',')})`)
            .order('created_at', { ascending: false })
            .limit(1000);
        } catch (e) {
          console.warn(FILE_ID, 'combined query failed, falling back to workflow_status in()', e);
          res = await this.supabaseService.supabase
            .from('submissions')
            .select('*')
            .in('workflow_status', workflowStates)
            .order('created_at', { ascending: false })
            .limit(1000);
        }

        // If no rows returned, fall back to a permissive recent submissions query
        if ((!res || !res.data || res.data.length === 0) && (!res || !res.error)) {
          console.log(FILE_ID, 'no rows from combined query — running permissive recent-posts fallback');
          res = await this.supabaseService.supabase
            .from('submissions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000);
        }

      } else if (role === 'ORGANIZATION' && appUserId) {
        console.log(FILE_ID, 'role=ORGANIZATION — fetching submissions for organization user_id', appUserId);
        res = await this.supabaseService.supabase
          .from('submissions')
          .select('*')
          .eq('user_id', appUserId)
          .order('created_at', { ascending: false })
          .limit(1000);
      } else {
        console.log(FILE_ID, 'role unknown — running safe recent posts query');
        res = await this.supabaseService.supabase
          .from('submissions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
      }

      console.log(FILE_ID, 'query result count=', (res.data && res.data.length) || 0, ' error=', res.error);

      if (res.error) {
        console.error(FILE_ID, 'query error', res.error);
        this.posts = [];
        this.filteredPosts = [];
        this.applyFilters();
        return;
      }

      this.posts = res.data || [];
      this.filteredPosts = this.posts.slice();
      this.applyFilters();

      if (!this.posts || this.posts.length === 0) {
        console.warn(FILE_ID, 'no submissions returned. Verify columns: assigned_to, workflow_status, created_at');
      }

    } catch (err) {
      console.error(FILE_ID, 'unexpected error', err);
      this.posts = [];
      this.filteredPosts = [];
      this.applyFilters();
    }
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  applyFilters() {
    const q = (this.searchQuery || '').toString().trim().toLowerCase();
    const s = (this.filterStatus || '').toString().trim();
    this.filteredPosts = (this.posts || []).filter(p => {
      if (s) {
        if ((p.status || p.workflow_status || '').toString() !== s) return false;
      }
      if (q) {
        const text = ((p.original_caption || '') + ' ' + (p.enhanced_caption || '') + ' ' + (p.user_id || '')).toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }

  statusLabel(post: any) {
    const st = (post.status || post.workflow_status || '').toString();
    if (!st) return 'Unknown';
    if (st === 'pending') return 'Pending';
    if (st === 'in_review' || st === 'submitted') return 'Review';
    if (st === 'completed' || st === 'approved') return 'Approved';
    if (st === 'posted') return 'Posted';
    return st;
  }

  statusColor(post: any) {
    const st = (post.status || post.workflow_status || '').toString();
    if (st === 'pending') return 'warning';
    if (st === 'in_review' || st === 'submitted') return 'primary';
    if (st === 'completed' || st === 'approved') return 'success';
    if (st === 'posted') return 'secondary';
    return 'medium';
  }

  statusClass(post: any) {
    const st = (post.status || post.workflow_status || '').toString();
    if (st === 'pending') return 'pending-line';
    if (st === 'in_review' || st === 'submitted') return 'review-line';
    if (st === 'completed' || st === 'approved') return 'approved-line';
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
