import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';
import { EnhancePage } from '../enhance/enhance.page';

@Component({
  selector: 'app-all-submissions',
  templateUrl: './all-submissions.page.html',
  styleUrls: ['./all-submissions.page.scss'],
  standalone: false,
})
export class AllSubmissionsPage implements OnInit {

  posts: any[] = [];

  constructor(
    private supabaseService: SupabaseService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.getPosts();
  }

  async getPosts() {

    const { data, error } = await this.supabaseService.supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    console.log(data);
    console.log(error);

    if(data) {
      this.posts = data;
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
}