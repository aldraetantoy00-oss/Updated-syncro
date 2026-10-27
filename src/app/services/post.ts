import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class PostService {

  constructor(private supabaseService: SupabaseService) {}

  async addPost(data: any) {
    const userId = await this.supabaseService.getAppUserId();
    if (userId === null) return { data: null, error: new Error('User profile is unavailable.') };

    return this.supabaseService.supabase.from('submissions').insert({
      user_id: userId,
      original_caption: data.original_caption || data.content || '',
      enhanced_caption: data.enhanced_caption || '',
      status: 'pending',
      workflow_status: 'submitted'
    }).select().single();
  }

  getPosts() {
    return this.supabaseService.supabase.from('submissions')
      .select('*')
      .order('created_at', { ascending: false });
  }

  updatePost(id: string | number, data: any) {
    return this.supabaseService.supabase.from('submissions')
      .update(data)
      .eq('id', id);
  }
}