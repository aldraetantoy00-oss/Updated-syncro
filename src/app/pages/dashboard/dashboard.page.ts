import { Component, OnInit } from '@angular/core';
import { PostService } from '../../services/post';
import { ModalController } from '@ionic/angular';
import { ReviewPage } from '../review/review.page'; // ✅ IMPORTANT

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {

  posts: any[] = [];
  awaiting: any[] = [];

  stats = {
    total: 0,
    pending: 0,
    in_review: 0,
    approved: 0
  };

  constructor(
    private postService: PostService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.postService.getPosts().subscribe((data: any[]) => {

      this.posts = data;

      this.stats.total = data.length;
      this.stats.pending = data.filter(p => p.status === 'pending').length;
      this.stats.in_review = data.filter(p => p.status === 'in_review').length;
      this.stats.approved = data.filter(p => p.status === 'completed').length;

      this.awaiting = data.filter(p => p.status === 'pending');
    });
  }

  async openReview(post: any) {
    const modal = await this.modalCtrl.create({
      component: ReviewPage,
      componentProps: { post },
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 0.5
    });

    await modal.present();
  }

}