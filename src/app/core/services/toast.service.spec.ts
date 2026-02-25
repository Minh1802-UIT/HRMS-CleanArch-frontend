import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';
import { MessageService } from 'primeng/api';

describe('ToastService', () => {
  let service: ToastService;
  let messageServiceSpy: jasmine.SpyObj<MessageService>;

  beforeEach(() => {
    messageServiceSpy = jasmine.createSpyObj('MessageService', ['add']);

    TestBed.configureTestingModule({
      providers: [
        ToastService,
        { provide: MessageService, useValue: messageServiceSpy }
      ]
    });

    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call messageService.add with success severity', () => {
    service.showSuccess('Title', 'Detail');
    expect(messageServiceSpy.add).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Title',
      detail: 'Detail',
      life: 3000
    });
  });

  it('should call messageService.add with error severity', () => {
    service.showError('Error Title', 'Error Detail');
    expect(messageServiceSpy.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error Title',
      detail: 'Error Detail',
      life: 3000
    });
  });

  it('should call messageService.add with info severity', () => {
    service.showInfo('Info', 'Info Detail');
    expect(messageServiceSpy.add).toHaveBeenCalledWith({
      severity: 'info',
      summary: 'Info',
      detail: 'Info Detail',
      life: 3000
    });
  });

  it('should call messageService.add with warn severity', () => {
    service.showWarn('Warning', 'Warn Detail');
    expect(messageServiceSpy.add).toHaveBeenCalledWith({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Warn Detail',
      life: 3000
    });
  });
});
