import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-enhance',
  templateUrl: './enhance.page.html',
  styleUrls: ['./enhance.page.scss'], 
  standalone: false
})
export class EnhancePage {

  @Input() post: any;

  selectedProvider = 'openai';
  tone = 'formal';
  enhancedText = '';
  comments = '';

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    this.enhancedText = this.post.content; // preload
  }

  close() {
    this.modalCtrl.dismiss();
  }

  generateAI() {
    this.enhancedText = `✨ ${this.post.content}

This version is more engaging, professional, and polished.`;
  }

  preview() {
    this.modalCtrl.dismiss({
      enhancedCaption: this.enhancedText,
      comments: this.comments
    });
  }
}