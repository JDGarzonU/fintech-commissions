import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpHeaders } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TransactionsService, Transaction } from './transactions';
import { vi } from 'vitest';

class FakeEventSource {
  static last?: FakeEventSource;

  url: string;
  onopen: null | (() => void) = null;
  onerror: null | (() => void) = null;

  private listeners = new Map<string, Array<(e: MessageEvent) => void>>();
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.last = this;
  }

  addEventListener(type: string, cb: EventListener) {
    const arr = this.listeners.get(type) ?? [];
    arr.push(cb as any);
    this.listeners.set(type, arr);
  }

  close() {
    this.closed = true;
  }

  // helpers
  emitOpen() {
    this.onopen?.();
  }

  emitError() {
    this.onerror?.();
  }

  emit(type: string, data: any) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    const evt = { data: payload } as MessageEvent;
    (this.listeners.get(type) ?? []).forEach((cb) => cb(evt));
  }
}

describe('TransactionsService', () => {
  let service: TransactionsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();

    (globalThis as any).EventSource = FakeEventSource as any;

    TestBed.configureTestingModule({
      providers: [TransactionsService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TransactionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    FakeEventSource.last = undefined;
    TestBed.resetTestingModule();
  });

  it('list() debe llamar GET /api/transactions', () => {
    service.list().subscribe();

    const req = httpMock.expectOne('/api/transactions');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('listPaged() debe llamar GET /api/transactions?page&size y leer headers', () => {
    service.listPaged(0, 10).subscribe((resp) => {
      expect(resp.body).toEqual([]);
      expect(resp.headers.get('X-Total-Count')).toBe('25');
    });

    const req = httpMock.expectOne((r) => {
      return (
        r.method === 'GET' &&
        r.url === '/api/transactions' &&
        r.params.get('page') === '0' &&
        r.params.get('size') === '10'
      );
    });

    expect(req.request.method).toBe('GET');

    req.flush([], {
      headers: new HttpHeaders({ 'X-Total-Count': '25' }),
    });
  });

  it('create() debe hacer POST /api/transactions con {amount}', () => {
    const amount = 123.45;

    service.create(amount).subscribe((res) => {
      expect(res.amount).toBe(amount);
    });

    const req = httpMock.expectOne('/api/transactions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ amount });
    req.flush({ id: 1, amount, commission: 2, createdAt: new Date().toISOString() });
  });

  it('stream() debe marcar conectado en onopen y desconectado en onerror', () => {
    const statuses: boolean[] = [];
    const subStatus = service.sseStatus$.subscribe((v) => statuses.push(v));

    const subStream = service.stream().subscribe();

    const es = FakeEventSource.last!;
    expect(es.url).toBe('/api/transactions/stream');

    es.emitOpen();
    es.emitError();

    expect(statuses).toContain(true);
    expect(statuses).toContain(false);

    subStream.unsubscribe();
    subStatus.unsubscribe();
  });

  it('stream() debe emitir Transaction al recibir evento "transaction"', () => {
    const received: Transaction[] = [];
    const sub = service.stream().subscribe((t) => received.push(t));

    const es = FakeEventSource.last!;
    es.emitOpen();

    es.emit('transaction', { id: 9, amount: 15000, commission: 750, createdAt: '2026-01-01T00:00:00Z' });

    expect(received.length).toBe(1);
    expect(received[0].id).toBe(9);

    sub.unsubscribe();
  });

  it('stream() no debe romperse con JSON inválido (no emite)', () => {
    // silencia el console.error para que no ensucie el output del test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

    const received: Transaction[] = [];
    const sub = service.stream().subscribe((t) => received.push(t));

    const es = FakeEventSource.last!;
    es.emitOpen();

    es.emit('transaction', '{invalid-json');

    expect(received.length).toBe(0);

    sub.unsubscribe();
    spy.mockRestore();
  });

  it('al desuscribirse del stream debe cerrar EventSource y marcar desconectado', () => {
    const statuses: boolean[] = [];
    const subStatus = service.sseStatus$.subscribe((v) => statuses.push(v));

    const sub = service.stream().subscribe();
    const es = FakeEventSource.last!;

    es.emitOpen();
    sub.unsubscribe();

    expect(es.closed).toBe(true);
    expect(statuses[statuses.length - 1]).toBe(false);

    subStatus.unsubscribe();
  });
});
