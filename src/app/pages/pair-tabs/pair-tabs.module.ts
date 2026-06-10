import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PairTabsPageRoutingModule } from './pair-tabs-routing.module';

import { PairTabsPage } from './pair-tabs.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PairTabsPageRoutingModule
  ],
  declarations: [ PairTabsPage ]
})
export class PairTabsPageModule { }
