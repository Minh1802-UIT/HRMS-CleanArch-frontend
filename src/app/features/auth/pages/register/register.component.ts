import { Component, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  email: string = '';

  constructor(private logger: LoggerService) {}

  onSubmit() {
    this.logger.debug('Registration attempt with email:', this.email);
    // Logic for registration will be added here
  }
}
