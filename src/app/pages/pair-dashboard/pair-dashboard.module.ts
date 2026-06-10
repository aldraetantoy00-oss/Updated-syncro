import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PairDashboardPageRoutingModule } from './pair-dashboard-routing.module';

import { PairDashboardPage } from './pair-dashboard.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PairDashboardPageRoutingModule
  ],
  declarations: [ PairDashboardPage ]
})
export class PairDashboardPageModule { }
