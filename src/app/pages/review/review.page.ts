import { Component, Input, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PostService } from '../../services/post';

@Component({
  selector: 'app-review',
  templateUrl: './review.page.html',
  styleUrls: ['./review.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule
  ]
})
export class ReviewPage implements OnInit {

  @Input() post: any;

  decision = 'approve';
  feedback = '';

  constructor(
    private modalCtrl: ModalController,
    private postService: PostService
  ) {}

  ngOnInit() {
    // ✅ fallback (in case no enhance used)
    if (!this.post.originalContent) {
      this.post.originalContent = this.post.content;
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }

  submit() {
    if (this.decision === 'approve') {
      this.postService.updatePost(this.post.id, {
        status: 'completed',
        content: this.post.content, // ✅ save enhanced
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