import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Transaction, TransactionsService } from '../services/transactions';

@Component({
    selector: 'app-dashboard-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DecimalPipe, DatePipe],
    template: `
  <div class="page">
    <header class="top">
      <div>
        <h1>Commissions</h1>
        <p class="muted">Dashboard de transacciones con actualizaciones en tiempo real (SSE).</p>
      </div>

      <div class="pill" [class.ok]="connected()" [class.bad]="!connected()">
        <span class="dot"></span>
        <span>{{ connected() ? 'SSE conectado' : 'SSE desconectado' }}</span>
      </div>
    </header>

    <section class="grid">
      <div class="card">
        <div class="cardTitle">Total transacciones</div>
        <div class="cardValue">{{ totalCount() }}</div>
      </div>

      <div class="card">
        <div class="cardTitle">Monto total</div>
        <div class="cardValue">{{ totalAmount() | currency:'USD':'symbol':'1.0-0' }}</div>
      </div>

      <div class="card">
        <div class="cardTitle">Comisión total</div>
        <div class="cardValue">{{ totalCommission() | currency:'USD':'symbol':'1.0-0' }}</div>
      </div>
    </section>

    <section class="content">
      <div class="card formCard">
        <h2>Nueva transacción</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <label>
            Monto
            <input
              type="number"
              inputmode="decimal"
              formControlName="amount"
              placeholder="Ej: 15000"
              step="0.01"
              min="0"
            />
          </label>

          <div class="hint" *ngIf="amountCtrl.touched && amountCtrl.invalid">
            <span *ngIf="amountCtrl.errors?.['required']">El monto es obligatorio.</span>
            <span *ngIf="amountCtrl.errors?.['min']">Debe ser mayor que 0.</span>
          </div>

          <button type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Guardando…' : 'Crear' }}
          </button>

          <div class="error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
        </form>
      </div>

      <div class="card tableCard">
        <div class="tableTop">
          <h2>Transacciones</h2>
          <div class="muted small">Mostrando {{ transactions().length }} registros</div>
                    <div class="pager">
            <button type="button" (click)="loadPage(page() - 1)" [disabled]="page() === 0">Anterior</button>

            <span class="muted small">
              Página {{ page() + 1 }} / {{ totalPages() }} · Total {{ totalElements() }}
            </span>

            <button type="button" (click)="loadPage(page() + 1)" [disabled]="page() + 1 >= totalPages()">Siguiente</button>
          </div>

          <div class="hint" *ngIf="hasNew()">
            Hay nuevas transacciones. Vuelve a la página 1 para verlas.
          </div>
        </div>

        <div class="tableWrap">
          <table>
            <colgroup>
                <col class="col-id" />
                <col class="col-amount" />
                <col class="col-commission" />
                <col class="col-date" />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th class="right">Monto</th>
                <th class="right">Comisión</th>
                <th>Fecha</th>
              </tr>
            </thead>

            <tbody>
              <tr *ngFor="let t of transactions()">
                <td class="mono">{{ t.id }}</td>
                <td class="right">{{ t.amount | number:'1.0-2' }}</td>
                <td class="right">{{ t.commission | number:'1.0-2' }}</td>
                <td>{{ t.createdAt | date:'yyyy-MM-dd HH:mm:ss' }}</td>
              </tr>

              <tr *ngIf="transactions().length === 0">
                <td colspan="4" class="empty">Sin transacciones aún.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
  `,
    styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, OnDestroy {
    private sub = new Subscription();

    private api = inject(TransactionsService);
    private fb = inject(FormBuilder);

    transactions = signal<Transaction[]>([]);
    connected = signal<boolean>(false);
    saving = signal<boolean>(false);
    errorMsg = signal<string>('');

    page = signal<number>(0);
    size = signal<number>(10);
    totalElements = signal<number>(0);
    totalPages = computed(() => Math.max(1, Math.ceil(this.totalElements() / this.size())));
    hasNew = signal<boolean>(false);

    private seenIds = new Set<string>();

    loadPage(p: number): void {
        this.errorMsg.set('');
        this.hasNew.set(false);

        this.sub.add(
            this.api.listPaged(p, this.size()).subscribe({
                next: (resp) => {
                    const list = resp.body ?? [];

                    const total = Number(resp.headers.get('X-Total-Count') ?? '0');
                    this.totalElements.set(Number.isFinite(total) ? total : 0);

                    this.page.set(p);

                    const sorted = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
                    this.transactions.set(sorted);

                    this.seenIds.clear();
                    sorted.forEach(t => this.seenIds.add(String(t.id)));
                },
                error: () => this.errorMsg.set('No se pudo cargar el listado. Revisa backend/proxy.'),
            })
        );
    }

    form = this.fb.group({
        amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    });

    get amountCtrl() {
        return this.form.controls.amount;
    }

    totalCount = computed(() => this.totalElements());
    totalAmount = computed(() => this.transactions().reduce((acc, t) => acc + Number(t.amount || 0), 0));
    totalCommission = computed(() => this.transactions().reduce((acc, t) => acc + Number(t.commission || 0), 0));

    ngOnInit(): void {
        this.loadPage(0);

        this.sub.add(
            this.api.sseStatus$.subscribe(ok => this.connected.set(ok))
        );

        this.sub.add(
            this.api.stream().subscribe({
                next: (t) => {
                    const id = String(t.id);

                    if (this.seenIds.has(id)) return;

                    this.seenIds.add(id);

                    this.totalElements.set(this.totalElements() + 1);

                    if (this.page() === 0) {
                        const current = this.transactions();
                        const nextList = [t, ...current].slice(0, this.size());
                        this.transactions.set(nextList);
                    } else {
                        this.hasNew.set(true);
                    }
                },
            })
        );
    }

    onSubmit(): void {
        if (this.form.invalid) return;

        this.errorMsg.set('');
        this.saving.set(true);

        const amount = Number(this.amountCtrl.value);

        this.sub.add(
            this.api.create(amount).subscribe({
                next: () => {
                    this.form.reset({ amount: null });
                    this.saving.set(false);
                    this.loadPage(0);
                },
                error: (err) => {
                    this.saving.set(false);

                    const apiErr = err?.error;

                    let msg =
                        apiErr?.details?.[0]?.message ||
                        apiErr?.error ||
                        'Error creando la transacción.';

                    if (apiErr?.details?.[0]?.field === 'amount') {
                        msg = 'El monto es demasiado grande o tiene más de 2 decimales.';
                    }

                    this.errorMsg.set(msg);
                },

            })
        );
    }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }
}
