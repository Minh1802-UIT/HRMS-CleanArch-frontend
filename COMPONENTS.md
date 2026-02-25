# HRMS-UI Shared Components

This project uses reusable components to maintain consistency and reduce code duplication.

## Form Components

Located in `src/app/shared/components/`.

### 1. `FormInputComponent`
**Selector**: `<app-form-input>`
**Purpose**: Standardized input field with label, styling, and validation handling.

**Inputs**:
- `formGroup` (FormGroup): Parent form group.
- `formControlName` (string): Name of the control.
- `label` (string): Field label.
- `type` (string): Input type (text, email, date, etc.). Default: 'text'.
- `placeholder` (string): Placeholder text.
- `required` (boolean): Shows red asterisk if true.
- `errorMessage` (string): Validation message to show on error.

**Usage**:
```html
<app-form-input 
  [formGroup]="form" 
  formControlName="email" 
  label="Email" 
  type="email" 
  [required]="true">
</app-form-input>
```

### 2. `FormSelectComponent`
**Selector**: `<app-form-select>`
**Purpose**: Standardized select dropdown with label, styling, and validation.

**Inputs**:
- `formGroup` (FormGroup): Parent form group.
- `formControlName` (string): Name of the control.
- `label` (string): Field label.
- `options` (any[]): Array of data objects.
- `optionValue` (string): Property to use as value (default: 'id').
- `optionLabel` (string): Property to use as label (default: 'name').
- `required` (boolean): Shows red asterisk if true.

**Usage**:
```html
<app-form-select 
  [formGroup]="form" 
  formControlName="deptId" 
  label="Department" 
  [options]="departments" 
  optionLabel="name" 
  optionValue="id">
</app-form-select>
```

---

## Add Employee Wizard Components

Located in `src/app/components/add-employee/`.

- **`EmployeeWizardStepsComponent`**: Sidebar navigation for the wizard.
- **`EmployeeFormSuccessComponent`**: Success message screen.
- **Step Components**:
  - `StepPersonalInfoComponent`
  - `StepJobDetailsComponent`
  - `StepCompensationComponent`
  - `StepDocumentsComponent`
