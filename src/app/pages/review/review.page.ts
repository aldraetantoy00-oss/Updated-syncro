import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PostService } from '../../services/post';

@Component({
  selector: 'app-review',
  templateUrl: './review.page.html',

  // 🔥 THIS IS THE KEY
  standalone: true,

  // 🔥 THIS FIXES YOUR ERROR
  imports: [
    IonicModule,
    CommonModule,
    FormsModule
  ]
})
export class ReviewPage {

  @Input() post: any;

  decision = 'approve';
  feedback = '';

  constructor(
    private modalCtrl: ModalController,
    private postService: PostService
  ) {}

  close() {
    this.modalCtrl.dismiss();
  }

  submit() {
    if (this.decision === 'approve') {
      this.postService.updatePost(this.post.id, {
        status: 'completed',
        feedback: ''
      });
    } else {
      this.postService.updatePost(this.post.id, {
        status: 'pending',
        feedback: this.feedback
      });
    }

    this.modalCtrl.dismiss();
  }
}