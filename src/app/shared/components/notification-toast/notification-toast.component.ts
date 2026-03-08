import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { ToastService, Toast } from '@core/services/toast.service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [NgClass],
  templateUrl: './notification-toast.component.html',
  styleUrl: './notification-toast.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationToastComponent {
  private toastService = inject(ToastService);
  toasts = this.toastService.toasts;

  remove(id: number) { this.toastService.remove(id); }

  iconClass(type: string): string {
    const map: Record<string, string> = {
      success: 'pi-check-circle',
      error:   'pi-times-circle',
      info:    'pi-info-circle',
      warn:    'pi-exclamation-triangle'
    };
    return map[type] ?? 'pi-info-circle';
  }

  trackById(_: number, t: Toast): number { return t.id; }
}
