import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DepartmentOrganizationsPage } from './department-organizations.page';

const routes: Routes = [{ path: '', component: DepartmentOrganizationsPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DepartmentOrganizationsPageRoutingModule {}
