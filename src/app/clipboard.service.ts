import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ClipboardService {
  async writeText(text: string): Promise<void> {
    if (!navigator.clipboard) throw new Error('Clipboard is unavailable.');
    await navigator.clipboard.writeText(text);
  }
}
