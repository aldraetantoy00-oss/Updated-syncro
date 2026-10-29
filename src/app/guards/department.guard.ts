import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthRoleService } from '../services/auth-role.service';

@Injectable({ providedIn: 'root' })
export class DepartmentGuard implements CanActivate {
  constructor(private authRole: AuthRoleService, private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    try {
      return await this.authRole.isDepartment() || this.router.parseUrl('/login');
    } catch (error) {
      console.error('Could not verify department access:', error);
      return this.router.parseUrl('/login');
    }
  }
}
