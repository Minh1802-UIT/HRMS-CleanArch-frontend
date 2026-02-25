import { Component } from '@angular/core';


@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [],
    template: `
        <div class="layout-footer">
            <span class="ml-2 font-medium">HRMS System &copy; {{ currentYear }}</span>
        </div>
    `,
    styles: [`
        .layout-footer {
            transition: margin-left .2s;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem 2rem;
            border-top: 1px solid var(--surface-border, #e5e7eb);
            background-color: var(--surface-card, #ffffff);
            color: var(--text-color, #374151);
            font-weight: 500;
            margin-top: auto;
        }
    `]
})
export class AppFooter {
  readonly currentYear = new Date().getFullYear();
}
