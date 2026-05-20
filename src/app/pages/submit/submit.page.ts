import { Component } from '@angular/core';
import { PostService } from '../../services/post';
import { NavController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-submit',
  templateUrl: './submit.page.html',
  styleUrls: ['./submit.page.scss'],
  standalone: false,
})
export class SubmitPage {

  content = '';
  links: string[] = [''];
  images: File[] = [];
  imagePreviews: string[] = [];

  constructor(
    private postService: PostService,
    private navCtrl: NavController,
    private loadingCtrl: LoadingController
  ) {}

  addLink() {
    this.links.push('');
  }

  removeLink(i: number) {
    this.links.splice(i, 1);
  }

  onFileSelected(event: any) {
    const files = Array.from(event.target.files);
    this.images = files as File[];

    this.imagePreviews = [];

    files.forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviews.push(e.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

  async submit() {
    const loading = await this.loadingCtrl.create({
      message: 'Submitting...'
    });
    await loading.present();

    try {
      const cleanLinks = this.links.filter(link => link.trim() !== '');

      await this.postService.addPost({
        content: this.content,
        links: cleanLinks,
        images: this.imagePreviews
      });

      loading.dismiss();

      this.content = '';
      this.links = [''];
      this.images = [];
      this.imagePreviews = [];

      this.navCtrl.navigateRoot('/tabs/dashboard');

    } catch (err) {
      loading.dismiss();
      alert('Submit failed');
      console.error(err);
    }
  }
}