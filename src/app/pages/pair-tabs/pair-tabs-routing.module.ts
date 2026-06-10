import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PairTabsPage } from './pair-tabs.page';

const routes: Routes = [
  {
    path: '',
    component: PairTabsPage,
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('../pair-dashboard/pair-dashboard.module').then(m => m.PairDashboardPageModule)
      },
      {
        path: 'queue',
        loadChildren: () => import('../all-submissions/all-submissions.module').then(m => m.AllSubmissionsPageModule)
      },
      {
        path: 'notifications',
        loadChildren: () => import('../notifications/notifications.module').then(m => m.NotificationsPageModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('../profile/profile.module').then(m => m.ProfilePageModule)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PairTabsPageRoutingModule { }
