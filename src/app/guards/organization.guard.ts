import { Injectable } from '@angular/core';
import { CanActivate, UrlTree, Router } from '@angular/router';
import { AuthRoleService } from '../services/auth-role.service';

@Injectable({ providedIn: 'root' })
export class OrganizationGuard implements CanActivate {
  constructor(private authRole: AuthRoleService, private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    try {
      const isAdmin = await this.authRole.isAdmin();
      const isCreator = await this.authRole.isCreator();
      if (isAdmin || isCreator) return true;
      // Not authorized for organization area — send to login to avoid guard-to-guard loops
      return this.router.parseUrl('/login');
    } catch (e) {
      return this.router.parseUrl('/login');
    }
  }
}
