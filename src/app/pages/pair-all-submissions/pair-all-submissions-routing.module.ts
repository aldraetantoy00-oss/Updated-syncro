import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PairAllSubmissionsPage } from './pair-all-submissions.page';

const routes: Routes = [{ path: '', component: PairAllSubmissionsPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PairAllSubmissionsPageRoutingModule {}