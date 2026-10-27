import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PairAllSubmissionsPageRoutingModule } from './pair-all-submissions-routing.module';
import { PairAllSubmissionsPage } from './pair-all-submissions.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, PairAllSubmissionsPageRoutingModule],
  declarations: [PairAllSubmissionsPage]
})
export class PairAllSubmissionsPageModule {}