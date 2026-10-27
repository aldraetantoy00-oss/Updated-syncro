import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiService {

  async generateCaption(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${environment.supabaseFunctionsUrl}/account-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: environment.supabaseAnonKey,
          Authorization: `Bearer ${environment.supabaseAnonKey}`
        },
        body: JSON.stringify({ action: 'generateCaption', text: prompt })
      });
      if (!response.ok) throw new Error('Caption generation failed');
      const result = await response.json();
      return result.caption || '';
    } catch (error) {
      console.error('AI Error:', error);
      return 'Failed to generate caption';
    }
  }
}