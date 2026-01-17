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
        </div>

        <div class="tableWrap">
          <table>
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

    form = this.fb.group({
        amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    });

    get amountCtrl() {
        return this.form.controls.amount;
    }

    totalCount = computed(() => this.transactions().length);
    totalAmount = computed(() => this.transactions().reduce((acc, t) => acc + Number(t.amount || 0), 0));
    totalCommission = computed(() => this.transactions().reduce((acc, t) => acc + Number(t.commission || 0), 0));

    ngOnInit(): void {
        this.sub.add(
            this.api.list().subscribe({
                next: (list) => {
                    const sorted = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
                    this.transactions.set(sorted);
                },
                error: () => this.errorMsg.set('No se pudo cargar el listado. Revisa backend/proxy.'),
            })
        );

        this.sub.add(
            this.api.sseStatus$.subscribe(ok => this.connected.set(ok))
        );

        this.sub.add(
            this.api.stream().subscribe({
                next: (t) => {
                    const current = this.transactions();
                    const exists = current.some((x) => String(x.id) === String(t.id));
                    if (!exists) this.transactions.set([t, ...current]);
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
                },
                error: (err) => {
                    this.saving.set(false);
                    this.errorMsg.set(err?.error?.error ?? 'Error creando la transacción.');
                },
            })
        );
    }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }
}
