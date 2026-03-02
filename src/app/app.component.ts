import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ThemeService } from '@core/services/theme.service';
import { ApiWarmupService } from '@core/services/api-warmup.service';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'hrms-dashboard';
  constructor(private _theme: ThemeService, warmup: ApiWarmupService) {
    // Wake up the Render.com backend as early as possible to avoid cold-start
    // delay on the first API call a user makes.
    warmup.warmup();
  }
}
