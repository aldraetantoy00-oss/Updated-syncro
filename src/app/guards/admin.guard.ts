import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthRoleService } from '../services/auth-role.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private authRole: AuthRoleService, private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    try {
      return await this.authRole.isAdmin() || this.router.parseUrl('/login');
    } catch {
      return this.router.parseUrl('/login');
    }
  }
}