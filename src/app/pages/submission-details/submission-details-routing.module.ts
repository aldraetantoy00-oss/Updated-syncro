import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SubmissionDetailsPage } from './submission-details.page';

const routes: Routes = [
  {
    path: '',
    component: SubmissionDetailsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SubmissionDetailsPageRoutingModule { }
