import { Component } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  standalone: false,
})
export class LoginPage {

  email = '';
  password = '';

 constructor(
  private auth: AuthService,
  private navCtrl: NavController
) {}

login() {
  this.auth.login(this.email, this.password)
    .then(() => {
      this.navCtrl.navigateRoot('/tabs/dashboard'); // replaces login
    })
    .catch(err => alert(err.message));
}

  signup() {
    this.auth.signup(this.email, this.password)
      .then(() => alert('Account created'));
  }
}