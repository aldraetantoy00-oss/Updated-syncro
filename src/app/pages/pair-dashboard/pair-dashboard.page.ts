import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';
import { EnhancePage } from '../enhance/enhance.page';

@Component({
  selector: 'app-pair-dashboard',
  templateUrl: './pair-dashboard.page.html',
  styleUrls: ['./pair-dashboard.page.scss'],
  standalone: false,
})
export class PairDashboardPage implements OnInit {

  submissions: any[] = [];
  
  // Stats
  totalSubmissions = 0;
  toReview = 0;
  inReview = 0;
  approved = 0;

  constructor(
    private supabaseService: SupabaseService,
    private modalCtrl: ModalController,
    private router: Router
  ) {}

  ngOnInit() {
    this.getSubmissions();
  }

  // Get all submissions (for PAIR to review)
  async getSubmissions() {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('PAIR SUBMISSIONS DATA:', data);
      console.log('PAIR SUBMISSIONS ERROR:', error);

      if (data) {
        // Format dates
        this.submissions = data.map(submission => ({
          ...submission,
          created_at: submission.created_at ? new Date(submission.created_at) : null
        }));

        // Calculate stats
        this.totalSubmissions = this.submissions.length;
        
        this.toReview = this.submissions.filter(
          s => s.status === 'pending'
        ).length;

        this.inReview = this.submissions.filter(
          s => s.workflow_status === 'submitted'
        ).length;

        this.approved = this.submissions.filter(
          s => s.status === 'approved' || s.status === 'completed'
        ).length;
      }
    } catch (e) {
      console.error('Error fetching submissions:', e);
    }
  }

  // View submission details
  viewDetails(submission: any) {
    this.router.navigateByUrl(`/submission-details?id=${submission.id}`);
  }

  // Open enhance modal for review
  async openReview(submission: any) {
    const modal = await this.modalCtrl.create({
      component: EnhancePage,
      componentProps: { post: submission }
    });

    await modal.present();

    modal.onDidDismiss().then(() => {
      this.getSubmissions();
    });
  }

  // Filter submissions by status
  getSubmissionsByStatus(status: string): any[] {
    if (status === 'pending') {
      return this.submissions.filter(s => s.status === 'pending');
    } else if (status === 'in_review') {
      return this.submissions.filter(s => s.workflow_status === 'submitted');
    } else if (status === 'approved') {
      return this.submissions.filter(s => s.status === 'approved' || s.status === 'completed');
    }
    return [];
  }
}
