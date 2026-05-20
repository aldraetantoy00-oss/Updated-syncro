import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EnhancePage } from './enhance.page';

const routes: Routes = [
  {
    path: '',
    component: EnhancePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EnhancePageRoutingModule {}
