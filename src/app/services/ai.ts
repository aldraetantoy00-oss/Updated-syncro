import { Injectable } from '@angular/core';
import OpenAI from 'openai';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiService {

  private openai = new OpenAI({
    apiKey: environment.openaiApiKey,
    dangerouslyAllowBrowser: true
  });

  constructor() {}

  async generateCaption(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `
Create a short Instagram caption.
Include emojis.
Add 3 hashtags.

Topic: ${prompt}
`
          }
        ],
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('AI Error:', error);
      return 'Failed to generate caption';
    }
  }
}