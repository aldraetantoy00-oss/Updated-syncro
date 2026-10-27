import { Component, OnInit } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';

interface AccountRequest {
  id: string | number;
  name: string | null;
  profile_name: string | null;
  username: string | null;
  email: string;
  department_id: number | null;
  created_at: string | null;
  departmentName?: string;
  approving?: boolean;
}

@Component({
  selector: 'app-account-requests',
  templateUrl: './account-requests.page.html',
  styleUrls: ['./account-requests.page.scss'],
  standalone: false
})
export class AccountRequestsPage implements OnInit {
  requests: AccountRequest[] = [];
  loading = true;
  error = '';

  constructor(
    private supabaseService: SupabaseService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.loadRequests();
  }

  async loadRequests() {
    this.loading = true;
    this.error = '';
    const [{ data, error }, { data: departments }] = await Promise.all([
      this.supabaseService.getPendingAccountRequests(),
      this.supabaseService.supabase.from('departments').select('id, department_name')
    ]);

    if (error) {
      this.error = 'Could not load account requests. Check the database migration and try again.';
      this.requests = [];
      this.loading = false;
      return;
    }

    const departmentNames = new Map((departments || []).map((department: any) => [department.id, department.department_name]));
    this.requests = (data || []).map((request: AccountRequest) => ({
      ...request,
      name: request.profile_name || request.name,
      username: request.username || request.name,
      departmentName: departmentNames.get(request.department_id) || 'Department not found'
    }));
    this.loading = false;
  }

  async approve(request: AccountRequest) {
    request.approving = true;
    const { data, error } = await this.supabaseService.approveAccountRequest(request.id);
    request.approving = false;

    const toast = await this.toastCtrl.create({
      message: error ? 'Could not approve this account request.' : data ? 'Account approved.' : 'This request is no longer pending.',
      duration: 2500,
      color: error ? 'danger' : 'success'
    });
    await toast.present();

    if (!error && data) {
      this.requests = this.requests.filter(item => item.id !== request.id);
    }
  }
}