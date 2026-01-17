import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Transaction {
  id: number | string;
  amount: number;
  commission: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private readonly baseUrl = '/api/transactions';

  private readonly _sseStatus = new BehaviorSubject<boolean>(false);
  readonly sseStatus$ = this._sseStatus.asObservable();

  constructor(private http: HttpClient, private zone: NgZone) { }

  list(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(this.baseUrl);
  }

  create(amount: number): Observable<Transaction> {
    return this.http.post<Transaction>(this.baseUrl, { amount });
  }

  stream(): Observable<Transaction> {
    return new Observable<Transaction>((subscriber) => {
      const es = new EventSource(`${this.baseUrl}/stream`);

      es.onopen = () => {
        this.zone.run(() => this._sseStatus.next(true));
      };

      const onTx = (event: MessageEvent) => {
        this.zone.run(() => {
          try {
            subscriber.next(JSON.parse(event.data) as Transaction);
          } catch (e) {
            console.error('SSE parse error', e, event.data);
          }
        });
      };

      // ✅ ESTE ES EL PUNTO CLAVE:
      es.addEventListener('transaction', onTx as EventListener);

      es.onerror = () => {
        this.zone.run(() => this._sseStatus.next(false));
        // No subscriber.error(): así EventSource reconecta solo
      };

      return () => {
        es.close();
        this.zone.run(() => this._sseStatus.next(false));
      };
    });
  }
}
