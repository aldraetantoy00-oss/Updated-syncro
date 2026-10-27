import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AccountRequestsPageRoutingModule } from './account-requests-routing.module';
import { AccountRequestsPage } from './account-requests.page';

@NgModule({
  imports: [CommonModule, IonicModule, AccountRequestsPageRoutingModule],
  declarations: [AccountRequestsPage]
})
export class AccountRequestsPageModule {}