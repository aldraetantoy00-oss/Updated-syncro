import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EnhancePageRoutingModule } from './enhance-routing.module';

import { EnhancePage } from './enhance.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EnhancePageRoutingModule
  ],
  declarations: [EnhancePage]
})
export class EnhancePageModule {}
