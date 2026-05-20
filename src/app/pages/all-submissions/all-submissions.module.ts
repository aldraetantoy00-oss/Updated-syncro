import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AllSubmissionsPageRoutingModule } from './all-submissions-routing.module';

import { AllSubmissionsPage } from './all-submissions.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AllSubmissionsPageRoutingModule
  ],
  declarations: [AllSubmissionsPage]
})
export class AllSubmissionsPageModule {}
