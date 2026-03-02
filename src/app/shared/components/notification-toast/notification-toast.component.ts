import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AsyncPipe, NgClass } from '@angular/common';
import { ToastService, Toast } from '@core/services/toast.service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [AsyncPipe, NgClass],
  templateUrl: './notification-toast.component.html',
  styleUrl: './notification-toast.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationToastComponent {
  toasts$ = this.toastService.toasts;

  constructor(private toastService: ToastService) {}

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
