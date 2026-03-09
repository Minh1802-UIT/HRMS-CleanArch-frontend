import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService, Toast } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService]
    });
    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add a toast with success type', fakeAsync(() => {
    service.showSuccess('Title', 'Detail');
    const toasts = service.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].title).toBe('Title');
    expect(toasts[0].detail).toBe('Detail');
    tick(5000);
  }));

  it('should add a toast with error type', fakeAsync(() => {
    service.showError('Error Title', 'Error Detail');
    const toasts = service.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].title).toBe('Error Title');
    expect(toasts[0].detail).toBe('Error Detail');
    tick(5000);
  }));

  it('should add a toast with info type', fakeAsync(() => {
    service.showInfo('Info', 'Info Detail');
    const toasts = service.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('info');
    expect(toasts[0].title).toBe('Info');
    expect(toasts[0].detail).toBe('Info Detail');
    tick(5000);
  }));

  it('should add a toast with warn type', fakeAsync(() => {
    service.showWarn('Warning', 'Warn Detail');
    const toasts = service.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('warn');
    expect(toasts[0].title).toBe('Warning');
    expect(toasts[0].detail).toBe('Warn Detail');
    tick(5000);
  }));

  it('should remove a toast by id', fakeAsync(() => {
    service.showSuccess('A', 'B');
    const id = service.toasts()[0].id;
    service.remove(id);
    expect(service.toasts().length).toBe(0);
    tick(5000);
  }));

  it('should auto-remove toast after 4500ms', fakeAsync(() => {
    service.showSuccess('Auto', 'Remove');
    expect(service.toasts().length).toBe(1);
    tick(4500);
    expect(service.toasts().length).toBe(0);
  }));
});
