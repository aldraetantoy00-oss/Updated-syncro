import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';



@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: false
})
export class SignupPage implements OnInit {

  name = '';
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  departmentId: number | null = null;
  departments: Array<{ id: number; name: string }> = [];
  departmentsError = '';
  formError = '';
  passwordError = '';
  confirmPasswordError = '';
  showPasswordRequirements = false;
  isSubmitting = false;
  private readonly departmentLabels = new Map([
    ['school of computer studies', 'School of Computer Studies'],
    ['school of law', 'School of Law'],
    ['school of art and sciences', 'School of Art and Sciences'],
    ['school of arts and sciences', 'School of Art and Sciences'],
    ['school of commerce', 'School of Commerce']
  ]);

  constructor(
    private router: Router,
    private loadingCtrl: LoadingController,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit() {
    this.loadDepartments();
  }

  async loadDepartments() {
    const { data, error } = await this.supabaseService.supabase
      .from('departments')
      .select('id, department_name')
      .order('department_name');

    if (error) {
      this.departmentsError = 'Could not load departments. Please try again later.';
      return;
    }

    const seenLabels = new Set<string>();
    this.departments = (data || []).reduce((options: Array<{ id: number; name: string }>, department: any) => {
      const key = String(department.department_name || '').trim().toLowerCase();
      const name = this.departmentLabels.get(key);
      if (name && !seenLabels.has(name)) {
        options.push({ id: department.id, name });
        seenLabels.add(name);
      }
      return options;
    }, []);
    const preferredOrder = [
      'School of Computer Studies',
      'School of Law',
      'School of Art and Sciences',
      'School of Commerce'
    ];
    this.departments.sort((a, b) => preferredOrder.indexOf(a.name) - preferredOrder.indexOf(b.name));
    this.departmentsError = this.departments.length ? '' : 'No departments are available yet.';
  }

  async register() {
    this.formError = '';
    this.passwordError = '';
    this.confirmPasswordError = '';

    if (this.departments.length === 0) {
      this.departmentsError = 'No schools or departments are available yet. Please contact an administrator.';
      return;
    }

    if (!this.name.trim() || !this.username.trim() || !this.email.trim() || !this.password || !this.confirmPassword || this.departmentId === null) {
      this.formError = 'Please complete all required fields.';
      return;
    }

    if (this.password.length < 6) {
      this.passwordError = 'Password must be at least 6 characters.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.confirmPasswordError = 'Passwords do not match.';
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingCtrl.create({
      message: 'Submitting account request...'
    });

    await loading.present();

    try {

      // Create user in `users` table
      const res: any = await this.supabaseService.signUpWithUsersTable({
        name: this.name,
        username: this.username,
        email: this.email,
        password: this.password,
        departmentId: this.departmentId as number
      });

      const error = res?.error ?? null;

      if (error) {
        this.formError = this.signupErrorMessage(error.message || String(error));
        return;
      }

      try { localStorage.setItem('accountRequestSubmitted', 'true'); } catch (e) {}
      this.router.navigateByUrl('/login', { replaceUrl: true });

    } catch (error: any) {
      this.formError = this.signupErrorMessage(error?.message || 'Something went wrong. Please try again.');
    } finally {
      await loading.dismiss().catch(() => {});
      this.isSubmitting = false;
    }
  }

  private signupErrorMessage(error: string) {
    if (error.includes('email_or_username_exists')) return 'That email or username is already registered.';
    if (error.includes('invalid_username')) return 'Use 3 to 30 characters: letters, numbers, periods, underscores, or hyphens.';
    if (error.includes('invalid_email')) return 'Enter a valid email address.';
    if (error.includes('password_too_short')) return 'Password must be at least 6 characters.';
    if (error.includes('invalid_department')) return 'Select a valid school or department.';
    if (error.includes('account service') || error.includes('Failed to fetch')) {
      return 'Account requests are temporarily unavailable. Please try again later.';
    }
    return 'Could not submit your account request. Please check the fields and try again.';
  }
}