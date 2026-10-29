import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AccountRequestsPageRoutingModule } from './account-requests-routing.module';
import { AccountRequestsPage } from './account-requests.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, AccountRequestsPageRoutingModule],
  declarations: [AccountRequestsPage]
})
export class AccountRequestsPageModule {}