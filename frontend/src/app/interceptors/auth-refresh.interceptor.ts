import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthRefreshInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!request.headers.has('Authorization')) {
      return next.handle(request);
    }

    return next.handle(request).pipe(
      catchError((error: unknown) => {
        if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
          return throwError(() => error);
        }

        return from(this.authService.getAccessToken(true)).pipe(
          switchMap(token => {
            if (!token) {
              return throwError(() => error);
            }

            return next.handle(request.clone({
              setHeaders: { Authorization: `Bearer ${token}` }
            }));
          })
        );
      })
    );
  }
}