import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DepartmentOrganizationsPageRoutingModule } from './department-organizations-routing.module';
import { DepartmentOrganizationsPage } from './department-organizations.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, DepartmentOrganizationsPageRoutingModule],
  declarations: [DepartmentOrganizationsPage]
})
export class DepartmentOrganizationsPageModule {}
