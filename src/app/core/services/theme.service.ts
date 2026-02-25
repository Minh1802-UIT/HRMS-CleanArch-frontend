import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'hrms-theme';

  isDark = signal<boolean>(this._loadPreference());

  constructor() {
    this._apply(this.isDark());
  }

  toggle(): void {
    this.isDark.update(v => !v);
    this._apply(this.isDark());
    localStorage.setItem(this.STORAGE_KEY, this.isDark() ? 'dark' : 'light');
  }

  private _apply(dark: boolean): void {
    const html = document.documentElement;
    if (dark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  private _loadPreference(): boolean {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) return stored === 'dark';
    // fallback to OS preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
