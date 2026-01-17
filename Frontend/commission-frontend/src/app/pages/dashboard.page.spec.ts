import { TestBed } from '@angular/core/testing';
import { DashboardPage } from './dashboard.page';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { TransactionsService, Transaction } from '../services/transactions';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { vi } from 'vitest';

function makeTx(id: any, createdAt: string, amount = 100, commission = 2): Transaction {
  return { id, createdAt, amount, commission };
}

describe('DashboardPage', () => {
  let listPagedMock = vi.fn();
  let createMock = vi.fn();
  let stream$: Subject<Transaction>;
  let sseStatus$: BehaviorSubject<boolean>;

  function setup(list: Transaction[] = [], totalCount = list.length) {
    stream$ = new Subject<Transaction>();
    sseStatus$ = new BehaviorSubject<boolean>(false);

    listPagedMock = vi.fn(() =>
      of(
        new HttpResponse({
          body: list,
          headers: new HttpHeaders({ 'X-Total-Count': String(totalCount) }),
        })
      )
    );

    createMock = vi.fn(() => of(makeTx('new', new Date().toISOString(), 10, 0.2)));

    const apiMock: Partial<TransactionsService> = {
      listPaged: listPagedMock as any,
      // lo dejamos por compatibilidad aunque ya no se use
      list: vi.fn(() => of(list)) as any,
      create: createMock as any,
      stream: () => stream$.asObservable(),
      sseStatus$: sseStatus$.asObservable(),
    };

    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [{ provide: TransactionsService, useValue: apiMock }],
    });

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges(); // ngOnInit -> loadPage(0)
    return { fixture, component: fixture.componentInstance };
  }

  it('debe cargar listPaged() y ordenar por createdAt desc', () => {
    const { component } = setup(
      [
        makeTx(1, '2026-01-01T10:00:00Z', 10, 0.2),
        makeTx(2, '2026-01-02T10:00:00Z', 20, 1),
        makeTx(3, '2025-12-31T23:00:00Z', 30, 1),
      ],
      3
    );

    const ids = component.transactions().map((t) => t.id);
    expect(ids).toEqual([2, 1, 3]);

    expect(listPagedMock).toHaveBeenCalledTimes(1);
    expect(listPagedMock).toHaveBeenCalledWith(0, 10);
  });

  it('debe calcular métricas (count, totalAmount, totalCommission)', () => {
    const { component } = setup(
      [
        makeTx(1, '2026-01-01T00:00:00Z', 100, 2),
        makeTx(2, '2026-01-02T00:00:00Z', 300, 15),
      ],
      2
    );

    // totalCount ahora viene del header X-Total-Count
    expect(component.totalCount()).toBe(2);

    // estas métricas se calculan sobre la página actual (como quedó tu UI)
    expect(component.totalAmount()).toBe(400);
    expect(component.totalCommission()).toBe(17);
  });

  it('si la lista viene vacía debe mostrar el estado "Sin transacciones aún."', () => {
    const { fixture } = setup([], 0);

    const txt = fixture.nativeElement.textContent as string;
    expect(txt).toContain('Sin transacciones aún.');
  });

  it('botón Crear debe estar deshabilitado si el form es inválido', () => {
    const { fixture, component } = setup([], 0);

    component.form.setValue({ amount: null });
    fixture.detectChanges();

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn.disabled).toBe(true);
  });

  it('al tocar el input y estar inválido debe mostrar mensaje de validación', () => {
    const { fixture, component } = setup([], 0);

    component.amountCtrl.setValue(0);
    component.amountCtrl.markAsTouched();
    fixture.detectChanges();

    const txt = fixture.nativeElement.textContent as string;
    // lo dejamos tolerante por si el texto exacto cambia un poco
    expect(txt.toLowerCase()).toMatch(/mayor|obligatorio|invalid/);
  });

  it('onSubmit(): debe llamar create(amount), limpiar form y apagar saving', () => {
    const { fixture, component } = setup([], 0);

    component.amountCtrl.setValue(15000);
    fixture.detectChanges();

    // submit del form
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(15000);

    expect(component.saving()).toBe(false);
    expect(component.amountCtrl.value).toBeNull();

    // init loadPage(0) + reload loadPage(0) después de crear
    expect(listPagedMock).toHaveBeenCalledTimes(2);
  });

  it('onSubmit(): si create falla debe mostrar errorMsg', () => {
    // fuerza error en create() con el formato real de tu backend
    createMock = vi.fn(() =>
      throwError(() => ({
        error: {
          status: 400,
          error: 'Validation error',
          path: '/transactions',
          details: [{ field: 'amount', message: 'amount is too large or has more than 2 decimal places' }],
        },
      }))
    );

    stream$ = new Subject<Transaction>();
    sseStatus$ = new BehaviorSubject<boolean>(false);

    listPagedMock = vi.fn(() =>
      of(
        new HttpResponse({
          body: [],
          headers: new HttpHeaders({ 'X-Total-Count': '0' }),
        })
      )
    );

    const apiMock: Partial<TransactionsService> = {
      listPaged: listPagedMock as any,
      create: createMock as any,
      stream: () => stream$.asObservable(),
      sseStatus$: sseStatus$.asObservable(),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [{ provide: TransactionsService, useValue: apiMock }],
    });

    const fix = TestBed.createComponent(DashboardPage);
    fix.detectChanges();
    const comp = fix.componentInstance;

    comp.amountCtrl.setValue(99);
    fix.detectChanges();

    const form: HTMLFormElement = fix.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    fix.detectChanges();

    // tu UI ya lo traduce (como tu screenshot)
    expect(comp.errorMsg()).toContain('El monto es demasiado grande');

    const txt = fix.nativeElement.textContent as string;
    expect(txt).toContain('El monto es demasiado grande');
    expect(comp.saving()).toBe(false);
  });

  it('SSE: debe reflejar el estado conectado/desconectado en UI', () => {
    const { fixture } = setup([], 0);

    sseStatus$.next(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('SSE conectado');

    sseStatus$.next(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('SSE desconectado');
  });

  it('SSE: debe pre-pend la transacción nueva en page 0 y no duplicar por id', () => {
    const { component } = setup([makeTx(1, '2026-01-01T00:00:00Z', 10, 0.2)], 1);

    // llega nueva por stream (page = 0 por defecto)
    stream$.next(makeTx(99, '2026-01-02T00:00:00Z', 20, 1));
    expect(component.transactions()[0].id).toBe(99);
    expect(component.transactions().length).toBe(2);

    // llega duplicada
    stream$.next(makeTx(99, '2026-01-02T00:00:00Z', 20, 1));
    expect(component.transactions().length).toBe(2);
  });
});
