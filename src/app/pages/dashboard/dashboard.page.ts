import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';

import { ReviewPage } from '../review/review.page';
import { EnhancePage } from '../enhance/enhance.page';

import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {

  posts: any[] = [];

  // STATS
  totalSubmissions = 0;

  awaitingReview = 0;

  withPair = 0;

  approved = 0;

  constructor(
    private modalCtrl: ModalController,
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  ngOnInit() {

    this.getPosts();

  }

  // GET POSTS
  async getPosts() {

    const appUserId = await this.supabaseService.getAppUserId();
    if (appUserId === null) {
      // no numeric profile id available - avoid querying with UUID which causes DB type errors
      this.posts = [];
      return;
    }

    const { data, error } = await this.supabaseService.supabase
      .from('submissions')
      .select('*')
      .eq('user_id', appUserId)
      .order('created_at', { ascending: false });

    console.log(
      'SUPABASE DATA:',
      data
    );

    console.log(
      'SUPABASE ERROR:',
      error
    );

    if (data) {

      // FORMAT DATES
      this.posts = data.map(post => ({

        ...post,

        created_at:
          post.created_at
            ? new Date(post.created_at)
            : null

      }));

      // COUNTS
      this.totalSubmissions =
        this.posts.length;

      this.awaitingReview =
        this.posts.filter(

          p => this.getStatus(p) === 'pending'

        ).length;

      this.withPair =
        this.posts.filter(

          p =>
            p.workflow_status ===
            'submitted'

        ).length;

      this.approved =
        this.posts.filter(

          p => this.getStatus(p) === 'approved'

        ).length;

    }
  }

  getStatus(post: any): string {
    const workflowStatus = String(post.workflow_status || '').toLowerCase();
    if (workflowStatus === 'rejected') return workflowStatus;
    return String(post.status || workflowStatus).toLowerCase();
  }

  // REVIEW
  async openReview(post: any) {

    const modal =
      await this.modalCtrl.create({

        component: ReviewPage,

        componentProps: { post }

      });

    await modal.present();

    modal.onDidDismiss().then(() => {

      this.getPosts();

    });
  }

  // ENHANCE
  async openEnhance(post: any) {

    const modal =
      await this.modalCtrl.create({

        component: EnhancePage,

        componentProps: { post }

      });

    await modal.present();

    // REFRESH AFTER CLOSE
    modal.onDidDismiss().then(() => {

      this.getPosts();

    });
  }

  // VIEW SUBMISSION DETAILS
  viewSubmissionDetails(post: any) {
    this.router.navigateByUrl(`/submission-details?id=${post.id}`);
  }
}