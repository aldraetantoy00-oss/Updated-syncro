import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { PairGuard } from './guards/pair.guard';
import { OrganizationGuard } from './guards/organization.guard';
import { AdminGuard } from './guards/admin.guard';
import { DepartmentGuard } from './guards/department.guard';

const routes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // Top-level shortcuts that reuse the existing tabs child routes
  {
    path: 'dashboard',
    redirectTo: 'tabs/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'submit',
    redirectTo: 'tabs/submit',
    pathMatch: 'full'
  },
  {
    path: 'notifications',
    redirectTo: 'tabs/notifications',
    pathMatch: 'full'
  },
  {
    path: 'profile',
    loadChildren: () => import('./pages/profile/profile.module').then(m => m.ProfilePageModule)
  },

  {
    path: 'change-password',
    loadChildren: () => import('./pages/change-password/change-password.module').then(m => m.ChangePasswordPageModule)
  },

  {
    path: 'admin/account-requests',
    loadChildren: () => import('./pages/account-requests/account-requests.module').then(m => m.AccountRequestsPageModule),
    canActivate: [AdminGuard]
  },

  {
    path: 'pair-dashboard',
    loadChildren: () => import('./pages/pair-dashboard/pair-dashboard.module').then(m => m.PairDashboardPageModule),
    canActivate: [PairGuard]
  },

  {
    path: 'pair-tabs',
    loadChildren: () => import('./pages/pair-tabs/pair-tabs.module').then(m => m.PairTabsPageModule),
    canActivate: [PairGuard]
  },

  {
    path: 'department/organizations',
    loadChildren: () => import('./pages/department-organizations/department-organizations.module').then(m => m.DepartmentOrganizationsPageModule),
    canActivate: [DepartmentGuard]
  },

  {
    path: 'submission-details',
    loadChildren: () => import('./pages/submission-details/submission-details.module').then(m => m.SubmissionDetailsPageModule)
  },

  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },

  {
    path: 'tabs',
    loadChildren: () => import('./pages/tabs/tabs.module').then(m => m.TabsPageModule),
    canActivate: [OrganizationGuard]
  },
  {
    path: 'enhance',
    loadChildren: () => import('./pages/enhance/enhance.module').then( m => m.EnhancePageModule)
  },
  {
    path: 'all-submissions',
    redirectTo: 'tabs/all-submissions',
    pathMatch: 'full'
  },
  {
    path: 'signup',
    loadChildren: () => import('./pages/signup/signup.module').then( m => m.SignupPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}