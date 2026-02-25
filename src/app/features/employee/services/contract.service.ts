import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response';
import { Contract } from '../models/contract.model';
import { LoggerService } from '@core/services/logger.service';

export { SalaryComponents, Contract, ContractStatus } from '../models/contract.model';

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private apiUrl = `${environment.apiUrl}/contracts`;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  // Create a new contract
  createContract(contract: Omit<Contract, 'id'>): Observable<Contract> {
    return this.http.post<ApiResponse<Contract>>(this.apiUrl, contract).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error('ContractService: createContract failed', err); return throwError(() => err); })
    );
  }

  // Get contracts for an employee
  getContractsByEmployee(employeeId: string): Observable<Contract[]> {
    return this.http.get<ApiResponse<Contract[]>>(`${this.apiUrl}/employee/${employeeId}`).pipe(
      map(response => response.data || []),
      catchError(err => { this.logger.error(`ContractService: getContractsByEmployee(${employeeId}) failed`, err); return throwError(() => err); })
    );
  }

  // Update contract details
  updateContract(id: string, contract: Partial<Contract>): Observable<Contract> {
    return this.http.put<ApiResponse<Contract>>(`${this.apiUrl}/${id}`, contract).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error(`ContractService: updateContract(${id}) failed`, err); return throwError(() => err); })
    );
  }

  // Terminate contract (helper)
  terminateContract(id: string): Observable<void> {
    return this.http.patch<ApiResponse<void>>(`${this.apiUrl}/${id}`, { status: 'Terminated', endDate: new Date() }).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error(`ContractService: terminateContract(${id}) failed`, err); return throwError(() => err); })
    );
  }
}
