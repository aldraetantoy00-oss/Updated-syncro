import { Component, OnInit } from '@angular/core';
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
    private supabaseService: SupabaseService
  ) {}

  ngOnInit() {

    this.getPosts();

  }

  // GET POSTS
  async getPosts() {

    const { data, error } =
      await this.supabaseService.supabase
        .from('submissions')
        .select('*')
        .order('created_at', {
          ascending: false
        });

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

          p => p.status === 'pending'

        ).length;

      this.withPair =
        this.posts.filter(

          p =>
            p.workflow_status ===
            'submitted'

        ).length;

      this.approved =
        this.posts.filter(

          p => p.status === 'approved'

        ).length;

    }
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
}