import { Component, OnDestroy } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { SupabaseService } from './services/supabase';
import { AuthRoleService } from './services/auth-role.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnDestroy {
  private navSub: Subscription | null = null;
  private _navigating = false;

  constructor(
    private router: Router,
    private menu: MenuController
    ,
    private supabaseService: SupabaseService,
    private authRole: AuthRoleService
  ) {
    // close the side menu on any navigation start to ensure it doesn't remain open
    this.navSub = this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationStart) {
        this.menu.close('main-menu').catch(() => {});
      }
    });

    // No Supabase Auth listener: app uses the users table and localStorage for auth state.
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }
}
