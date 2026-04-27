import { Component } from '@angular/core';
import { PostService } from '../../services/post';
import { Router } from '@angular/router';

@Component({
  selector: 'app-submit',
  templateUrl: './submit.page.html',
  standalone: false,
})
export class SubmitPage {

  content = '';

constructor(private postService: PostService, private router: Router) {}

post() {
  this.postService.addPost(this.content)
    .then(() => {
      this.content = '';

      if (this.router.url !== '/dashboard') { // ✅ prevent double load
        this.router.navigateByUrl('/dashboard');
      }
    });
}
}