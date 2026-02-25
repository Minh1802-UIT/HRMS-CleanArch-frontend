import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Employee Wizard Steps Component
 * 
 * Displays the step indicator sidebar for the employee add/edit wizard.
 * Shows current progress through the 4-step process.
 */
@Component({
  selector: 'app-employee-wizard-steps',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-wizard-steps.component.html',
  styleUrls: ['./employee-wizard-steps.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeWizardStepsComponent {
  @Input() currentStep: number = 1;
  @Input() isEditMode: boolean = false;

  /**
   * Get CSS classes for step indicator circle
   */
  getStepIndicatorClass(step: number): string {
    if (this.currentStep === step) {
      return 'bg-violet-600 text-white';
    } else if (this.currentStep > step) {
      return 'bg-violet-600 text-white';
    } else {
      return 'bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400';
    }
  }
}
