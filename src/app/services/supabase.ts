import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  supabase: SupabaseClient;

  constructor() {

    this.supabase = createClient(
      'https://hplgfkgocbbwwgyzzzmx.supabase.co',
      'sb_publishable_Qj5I14JD8S6K0IF_kxL_vg_BJ3tnfwA'
    );

  }
}