import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountRequestsPage } from './account-requests.page';

const routes: Routes = [{ path: '', component: AccountRequestsPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccountRequestsPageRoutingModule {}