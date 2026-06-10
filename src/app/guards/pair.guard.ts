import { Injectable } from '@angular/core';
import { CanActivate, UrlTree, Router } from '@angular/router';
import { AuthRoleService } from '../services/auth-role.service';

@Injectable({ providedIn: 'root' })
export class PairGuard implements CanActivate {
  constructor(private authRole: AuthRoleService, private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    try {
      const isPair = await this.authRole.isPair();
      const isAdmin = await this.authRole.isAdmin();
      if (isPair || isAdmin) return true;
      // Not authorized for pair area — send to login to avoid guard-to-guard loops
      return this.router.parseUrl('/login');
    } catch (e) {
      return this.router.parseUrl('/login');
    }
  }
}
