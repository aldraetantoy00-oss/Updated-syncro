import { Component } from '@angular/core';
import { AuthService } from '../../services/auth';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
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

        this.navCtrl.navigateRoot('/tabs/dashboard');

      })
      .catch(err => {

        alert(err.message);

      });

  }

  signup() {

    this.auth.signup(this.email, this.password)
      .then(() => {

        alert('Account created');

      });

  }

}