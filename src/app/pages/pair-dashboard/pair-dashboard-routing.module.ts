import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PairDashboardPage } from './pair-dashboard.page';

const routes: Routes = [
  {
    path: '',
    component: PairDashboardPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PairDashboardPageRoutingModule { }
