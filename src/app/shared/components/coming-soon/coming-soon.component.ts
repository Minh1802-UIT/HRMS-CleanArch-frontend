import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { RouterModule } from '@angular/router';
import { SharedNavbarComponent } from '../shared-navbar/shared-navbar.component';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [RouterModule, SharedNavbarComponent],
  template: `
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden relative">
      <!-- Decorative background elements -->
      <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      
      <app-shared-navbar [activePage]="activePage" [showSubTabs]="false"></app-shared-navbar>

      <main class="max-w-4xl mx-auto p-10 pt-32 text-center space-y-12 relative z-10 animate-fade-in-up">
        <div class="relative inline-block">
          <div class="w-48 h-48 bg-primary/10 rounded-[3.5rem] rotate-12 absolute -inset-6 blur-3xl animate-pulse"></div>
          <div class="w-48 h-48 glass-panel rounded-[3.5rem] flex items-center justify-center relative z-10 shadow-premium border-white/50 dark:border-white/10">
             <span class="material-symbols-outlined text-8xl text-primary animate-bounce">{{ icon }}</span>
          </div>
        </div>

        <div class="space-y-6 stagger-1">
          <h1 class="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {{ title }}
          </h1>
          <p class="text-xl text-slate-500 dark:text-slate-400 max-w-lg mx-auto font-medium leading-relaxed">
            We're meticulously crafting a world-class 
            <span class="text-primary font-bold">{{ title.toLowerCase() }}</span> experience for your organization.
          </p>
        </div>

        <div class="pt-8 stagger-2">
          <button routerLink="/dashboard" 
            class="group px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold shadow-2xl hover:bg-primary dark:hover:bg-primary dark:hover:text-white hover:-translate-y-1 transition-all uppercase tracking-[0.2em] text-sm flex items-center gap-3 mx-auto">
            <span class="material-symbols-outlined text-xl transition-transform group-hover:-translate-x-1">arrow_back</span>
            Return to Dashboard
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 stagger-3">
            <div class="glass-panel p-8 rounded-3xl border border-white/40 dark:border-white/5 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all">
                <div class="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <span class="material-symbols-outlined text-primary">auto_awesome</span>
                </div>
                <h3 class="font-extrabold text-slate-900 dark:text-white mb-2 text-lg">Coming Soon</h3>
                <p class="text-sm text-slate-400 font-medium">Automated workflows and deep actionable analytics.</p>
            </div>
            <div class="glass-panel p-8 rounded-3xl border border-white/40 dark:border-white/5 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all">
                <div class="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <span class="material-symbols-outlined text-primary">insights</span>
                </div>
                <h3 class="font-extrabold text-slate-900 dark:text-white mb-2 text-lg">Real-time Data</h3>
                <p class="text-sm text-slate-400 font-medium">Instant synchronization with our global HR engines.</p>
            </div>
            <div class="glass-panel p-8 rounded-3xl border border-white/40 dark:border-white/5 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all">
                <div class="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <span class="material-symbols-outlined text-primary">verified</span>
                </div>
                <h3 class="font-extrabold text-slate-900 dark:text-white mb-2 text-lg">Enterprise Grade</h3>
                <p class="text-sm text-slate-400 font-medium">Military grade security and compliance standards.</p>
            </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComingSoonComponent {
  @Input() title: string = 'In Development';
  @Input() icon: string = 'engineering';
  @Input() activePage: string = '';
}
