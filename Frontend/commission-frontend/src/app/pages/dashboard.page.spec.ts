import { TestBed } from '@angular/core/testing';
import { DashboardPage } from './dashboard.page';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { TransactionsService, Transaction } from '../services/transactions';

function makeTx(id: any, createdAt: string, amount = 100, commission = 2): Transaction {
  return { id, createdAt, amount, commission };
}

describe('DashboardPage', () => {
  let listMock = vi.fn();
  let createMock = vi.fn();
  let stream$: Subject<Transaction>;
  let sseStatus$: BehaviorSubject<boolean>;

  function setup(list: Transaction[] = []) {
    stream$ = new Subject<Transaction>();
    sseStatus$ = new BehaviorSubject<boolean>(false);

    listMock = vi.fn(() => of(list));
    createMock = vi.fn(() => of(makeTx('new', new Date().toISOString(), 10, 0.2)));

    const apiMock: Partial<TransactionsService> = {
      list: listMock as any,
      create: createMock as any,
      stream: () => stream$.asObservable(),
      sseStatus$: sseStatus$.asObservable(),
    };

    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [{ provide: TransactionsService, useValue: apiMock }],
    });

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges(); // dispara ngOnInit
    return { fixture, component: fixture.componentInstance };
  }

  it('debe cargar list() y ordenar por createdAt desc', () => {
    const { component } = setup([
      makeTx(1, '2026-01-01T10:00:00Z', 10, 0.2),
      makeTx(2, '2026-01-02T10:00:00Z', 20, 1),
      makeTx(3, '2025-12-31T23:00:00Z', 30, 1),
    ]);

    const ids = component.transactions().map((t) => t.id);
    expect(ids).toEqual([2, 1, 3]);
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it('debe calcular métricas (count, totalAmount, totalCommission)', () => {
    const { component } = setup([
      makeTx(1, '2026-01-01T00:00:00Z', 100, 2),
      makeTx(2, '2026-01-02T00:00:00Z', 300, 15),
    ]);

    expect(component.totalCount()).toBe(2);
    expect(component.totalAmount()).toBe(400);
    expect(component.totalCommission()).toBe(17);
  });

  it('si la lista viene vacía debe mostrar el estado "Sin transacciones aún."', () => {
    const { fixture } = setup([]);

    const txt = fixture.nativeElement.textContent as string;
    expect(txt).toContain('Sin transacciones aún.');
  });

  it('botón Crear debe estar deshabilitado si el form es inválido', () => {
    const { fixture, component } = setup([]);

    component.form.setValue({ amount: null });
    fixture.detectChanges();

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn.disabled).toBe(true);
  });

  it('al tocar el input y estar inválido debe mostrar mensaje de validación', () => {
    const { fixture, component } = setup([]);

    component.amountCtrl.setValue(0);
    component.amountCtrl.markAsTouched();
    fixture.detectChanges();

    const txt = fixture.nativeElement.textContent as string;
    expect(txt).toContain('Debe ser mayor que 0.');
  });

  it('onSubmit(): debe llamar create(amount), limpiar form y apagar saving', () => {
    const { fixture, component } = setup([]);

    component.amountCtrl.setValue(15000);
    fixture.detectChanges();

    // dispara submit del form
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(15000);

    expect(component.saving()).toBe(false);
    expect(component.amountCtrl.value).toBeNull();
  });

  it('onSubmit(): si create falla debe mostrar errorMsg', () => {
    const { fixture, component } = setup([]);

    // fuerza error en create()
    createMock = vi.fn(() => throwError(() => ({ error: { error: 'Bad request' } })));
    const apiMock: Partial<TransactionsService> = {
      list: vi.fn(() => of([])) as any,
      create: createMock as any,
      stream: () => new Subject<Transaction>().asObservable(),
      sseStatus$: new BehaviorSubject(false).asObservable(),
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

    expect(comp.errorMsg()).toBe('Bad request');
    expect(comp.saving()).toBe(false);

    const txt = fix.nativeElement.textContent as string;
    expect(txt).toContain('Bad request');
  });

  it('SSE: debe reflejar el estado conectado/desconectado en UI', () => {
    const { fixture } = setup([]);

    sseStatus$.next(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('SSE conectado');

    sseStatus$.next(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('SSE desconectado');
  });

  it('SSE: debe pre-pend la transacción nueva y no duplicar por id', () => {
    const { component } = setup([makeTx(1, '2026-01-01T00:00:00Z', 10, 0.2)]);

    // llega nueva por stream
    stream$.next(makeTx(99, '2026-01-02T00:00:00Z', 20, 1));
    expect(component.transactions()[0].id).toBe(99);
    expect(component.transactions().length).toBe(2);

    // llega duplicada
    stream$.next(makeTx(99, '2026-01-02T00:00:00Z', 20, 1));
    expect(component.transactions().length).toBe(2);
  });
});
