import { Component } from '@angular/core';
import {
  NavController,
  LoadingController
} from '@ionic/angular';

import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-submit',
  templateUrl: './submit.page.html',
  styleUrls: ['./submit.page.scss'],
  standalone: false,
})
export class SubmitPage {

  readonly maxCaptionLength = 2200;
  readonly maxFileSize = 5 * 1024 * 1024;
  readonly acceptedFileTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'text/plain'
  ]);
  contentType: 'social_media' | 'website_article' = 'social_media';
  submissionTarget: 'department' | 'pair' = 'department';
  departmentName = 'your Department';
  departmentId: number | string | null = null;
  isDepartmentUser = false;
  departmentLoadError = '';
  content = '';

  links: string[] = [''];

  attachments: Array<{ file: File; dataUrl: string }> = [];
  fileError = '';
  isSubmitting = false;

  constructor(
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private supabaseService: SupabaseService
  ) {
    this.loadDepartment();
  }

  async loadDepartment() {
    const user = await this.supabaseService.getUser();
    const profile = await this.supabaseService.getCurrentUserProfile();
    this.departmentId = user?.department_id ?? profile?.department_id ?? null;
    this.isDepartmentUser = String(user?.role || '').trim().toLowerCase() === 'department';
    if (this.isDepartmentUser) this.submissionTarget = 'pair';
    if (this.departmentId === null) {
      this.departmentName = 'your Department';
      this.submissionTarget = 'pair';
      return;
    }

    const { data, error } = await this.supabaseService.supabase
      .from('departments')
      .select('department_name')
      .eq('id', this.departmentId)
      .maybeSingle();
    if (error) {
      console.error('Could not load submitting department:', error);
      this.departmentLoadError = 'Could not load your department. You can still submit to PAIR.';
      return;
    }
    this.departmentName = data?.department_name || 'your Department';
  }

  addLink() {
    this.links.push('');
  }

  removeLink(i: number) {
    this.links.splice(i, 1);
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.fileError = '';

    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const supportedExtension = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'doc', 'docx', 'pdf', 'txt']
        .includes(extension);
      if (!this.acceptedFileTypes.has(file.type) && !supportedExtension) {
        this.fileError = `${file.name} is not a supported file type.`;
        continue;
      }
      if (file.size > this.maxFileSize) {
        this.fileError = `${file.name} is larger than 5 MB.`;
        continue;
      }

      try {
        const dataUrl = await this.readFile(file);
        this.attachments.push({ file, dataUrl });
      } catch (error) {
        console.error('Could not read attachment:', error);
        this.fileError = `Could not read ${file.name}. Please try another file.`;
      }
    }
    input.value = '';
  }

  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('File contents could not be read.'));
      reader.onerror = () => reject(reader.error || new Error('File could not be read.'));
      reader.readAsDataURL(file);
    });
  }

  removeAttachment(index: number) {
    this.attachments.splice(index, 1);
  }

  cancel() {
    this.content = '';
    this.links = [''];
    this.attachments = [];
    this.navCtrl.navigateBack('/tabs/dashboard');
  }

  attachmentIsImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  async submit() {

    if (this.isSubmitting) return;
    if (!this.content.trim()) {
      alert('Please enter the content you want to submit.');
      return;
    }
    if (this.content.length > this.maxCaptionLength) {
      alert(`Content must be ${this.maxCaptionLength.toLocaleString()} characters or fewer.`);
      return;
    }
    this.isSubmitting = true;

    const loading = await this.loadingCtrl.create({ message: 'Submitting...' });
    await loading.present();

    try {

      const cleanLinks =
        this.links.filter(

          link => link.trim() !== ''

        );

      // Get numeric application profile id (if available). If not, omit user_id to avoid type mismatch.
      const appUserId = await this.supabaseService.getAppUserId();
      const authUser = await this.supabaseService.getUser();

      // INSERT SUBMISSION
      // build payload and only include numeric user_id when available (prevents bigint errors)
      const payload: any = {
        original_caption: this.content,
        links: cleanLinks,
        media_paths: this.attachments.map(({ dataUrl }) => dataUrl),
        media_names: this.attachments.map(({ file }) => file.name),
        content_type: this.contentType,
        submission_target: this.submissionTarget,
        status: 'pending',
        workflow_status: 'submitted'
      };
      if (appUserId !== null) payload.user_id = appUserId;

      let data: any = null;
      let error: any = null;

      const userId = authUser && authUser.id ? Number(authUser.id) : null;


      try {
        // ensure payload uses numeric user id when available
        if (userId !== null && !Number.isNaN(userId)) payload.user_id = userId;
        const res = await this.supabaseService.supabase
          .from('submissions')
          .insert([payload])
          .select('id')
          .single();
        data = (res as any).data;
        error = (res as any).error;
      } catch (e: any) {
        console.error('Submission insert threw:', e);
        // surface as error to outer catch
        throw e;
      }

      if (data === null && error === null) {
        console.warn('Ambiguous submission response: both data and error are null.');
      }

      // ERROR
      if (error) {

        throw error;

      }

      if (data?.id !== undefined && data?.id !== null) {
        const notificationResult = await this.supabaseService.notifySubmissionCreated(data.id);
        if (notificationResult.error) {
          console.error('Submission was saved, but reviewers could not be notified:', notificationResult.error);
        }
      } else {
        console.error('Submission was saved without a returned ID; reviewers could not be notified.');
      }

      await loading.dismiss();

      // RESET
      this.content = '';

      this.links = [''];

      this.attachments = [];
      this.contentType = 'social_media';
      this.submissionTarget = this.isDepartmentUser ? 'pair' : 'department';

      alert('Submission successful');

      // REDIRECT
      this.navCtrl.navigateRoot('/tabs/dashboard');

    } catch (err) {

      await loading.dismiss();
      console.error(err);
      alert('Submit failed');

    }
    finally {
      this.isSubmitting = false;
    }
  }
}