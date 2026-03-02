import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';
import { ApiWarmupService } from '@core/services/api-warmup.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationToastComponent } from '@shared/components/notification-toast/notification-toast.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmDialogComponent, NotificationToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'hrms-dashboard';
  constructor(private _theme: ThemeService, warmup: ApiWarmupService) {
    warmup.warmup();
  }
}
