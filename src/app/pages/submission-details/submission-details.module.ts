import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SubmissionDetailsPageRoutingModule } from './submission-details-routing.module';

import { SubmissionDetailsPage } from './submission-details.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SubmissionDetailsPageRoutingModule
  ],
  declarations: [ SubmissionDetailsPage ]
})
export class SubmissionDetailsPageModule { }
