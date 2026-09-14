import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, map, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeadersWithToken() {
    return from(this.authService.getAccessToken()).pipe(
      map((token) => {
        if (!token) {
          throw new Error('User not authenticated');
        }

        return new HttpHeaders().set('Authorization', `Bearer ${token}`);
      })
    );
  }

  getSeasonFines(seasonId: string, playerId?: string) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.get(`${environment.apiUrl}/api/seasons/${seasonId}/fines`, {
        headers,
        params: { ...(playerId ? { playerId } : {}) }
      }))
    );
  }

  getUsers() {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.get(`${environment.apiUrl}/api/users`, { headers }))
    );
  }

  getSeasons() {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.get(`${environment.apiUrl}/api/seasons`, { headers }))
    );
  }

  getSeason(seasonId: string) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.get(`${environment.apiUrl}/api/seasons/${seasonId}`, { headers }))
    );
  }

  getSeasonPlayers(seasonId: string) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.get(`${environment.apiUrl}/api/seasons/${seasonId}/players`, { headers}))
    );
  }

  getSeasonSummary(seasonId: string, playerId?: string) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.get(`${environment.apiUrl}/api/seasons/${seasonId}/summary`, {
        headers,
        params: { ...(playerId ? { playerId } : {}) }
      }))
    );
  }

  getActiveSeason() {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.get(`${environment.apiUrl}/api/seasons/active`, { headers }))
    );
  }

  getSeasonRanking(seasonId: string) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.get(`${environment.apiUrl}/api/seasons/${seasonId}/ranking`, { headers }))
    );
  }

  getSeasonRules(seasonId: string) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.get(`${environment.apiUrl}/api/seasons/${seasonId}/rules`, {
        headers
      }))
    );
  }

  createRule(rule: { label: string; cost: number; matchDay: boolean }, seasonId: string) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.post(`${environment.apiUrl}/api/seasons/${seasonId}/rules`, rule, { headers, params: { seasonId } }))
    );
  }

  updateRule(id: string, rule: { label: string; cost: number; matchDay: boolean; active: boolean }, seasonId: string) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.put(`${environment.apiUrl}/api/seasons/${seasonId}/rules/${id}`, rule, { headers, params: { seasonId } }))
    );
  }

  getSeasonPayments(seasonId: string, playerId?: string ) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.get(`${environment.apiUrl}/api/seasons/${seasonId}/payments`, {
        headers,
        params: {...(playerId ? { playerId } : {}) }
      }))
    );
  }

  createPayment(seasonId: string, payment: {
    date: string;
    amount: string;
    playerId: string;
    comment?: string;
  }) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.post(`${environment.apiUrl}/api/seasons/${seasonId}/payments`, payment, { headers }))
    );
  }

  updatePayment(seasonId: string, paymentId: string, payment: {
    date: string;
    amount: string;
    playerId: string;
    comment?: string;
  }) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.put(`${environment.apiUrl}/api/seasons/${seasonId}/payments/${paymentId}`, payment, { headers }))
    );
  }

  deletePayment(seasonId: string, paymentId: string) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.delete(`${environment.apiUrl}/api/seasons/${seasonId}/payments/${paymentId}`, { headers }))
    );
  }

  createFine(seasonId: string, fine: {
    date: string;
    playerId: string;
    ruleId: string;
    amount?: number;
    comment?: string;
    photo?: string;
    matchDay?: boolean;
  }) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.post(`${environment.apiUrl}/api/seasons/${seasonId}/fines`, fine, { headers }))
    );
  }

  updateFine(seasonId: string, fineId: string, fine: {
    date: string;
    playerId: string;
    ruleId: string;
    amount?: number;
    comment?: string;
    photo?: string;
    matchDay?: boolean;
  }) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.put(`${environment.apiUrl}/api/seasons/${seasonId}/fines/${fineId}`, fine, { headers }))
    );
  }

  deleteFine(seasonId: string, fineId: string) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.delete(`${environment.apiUrl}/api/seasons/${seasonId}/fines/${fineId}`, { headers }))
    );
  }

  registerDeviceToken(token: string) {
    return this.getHeadersWithToken().pipe(
      switchMap((headers) => this.http.post(
        `${environment.apiUrl}/api/payments/device-token`,
        { token },
        { headers }
      ))
    );
  }
}
