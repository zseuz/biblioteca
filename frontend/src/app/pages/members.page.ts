import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Member } from '../core/models';
import { NotifyService } from '../core/notify.service';

@Component({
  selector: 'app-members-page',
  imports: [ReactiveFormsModule],
  template: `
    <h1>Usuarios</h1>

    <section class="card" aria-labelledby="form-title">
      <h2 id="form-title">{{ editing() ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
      <form [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="grid">
          <div>
            <label for="name">Nombre</label>
            <input id="name" formControlName="name" [class.invalid]="invalid('name')" [attr.aria-invalid]="invalid('name')" />
            @if (invalid('name')) { <p class="error">El nombre es obligatorio.</p> }
          </div>
          <div>
            <label for="email">Correo</label>
            <input id="email" type="email" formControlName="email" [class.invalid]="invalid('email')" [attr.aria-invalid]="invalid('email')" />
            @if (invalid('email')) { <p class="error">Ingresa un correo válido.</p> }
          </div>
        </div>
        <div class="actions">
          <button class="primary" type="submit" [disabled]="saving()">{{ editing() ? 'Guardar cambios' : 'Agregar usuario' }}</button>
          @if (editing()) { <button type="button" (click)="cancel()">Cancelar</button> }
        </div>
      </form>
    </section>

    <section class="card" aria-labelledby="list-title">
      <h2 id="list-title">Listado</h2>
      @if (loading()) {
        <p class="empty">Cargando…</p>
      } @else if (members().length === 0) {
        <p class="empty">Aún no hay usuarios registrados.</p>
      } @else {
        <div class="table-wrap">
          <table>
            <caption class="sr-only">Lista de usuarios</caption>
            <thead><tr><th>Nombre</th><th>Correo</th><th><span class="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              @for (m of members(); track m.id) {
                <tr>
                  <td>{{ m.name }}</td>
                  <td>{{ m.email }}</td>
                  <td>
                    <button type="button" (click)="edit(m)" [attr.aria-label]="'Editar ' + m.name">Editar</button>
                    <button type="button" class="danger" (click)="remove(m)" [attr.aria-label]="'Eliminar ' + m.name">Eliminar</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class MembersPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly members = signal<Member[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal<Member | null>(null);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
  });

  ngOnInit(): void {
    this.load();
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  load(): void {
    this.loading.set(true);
    this.api.listMembers().subscribe({
      next: members => { this.members.set(members); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const current = this.editing();
    const request = current ? this.api.updateMember(current.id, value) : this.api.createMember(value);
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.notify.ok(current ? 'Usuario actualizado' : 'Usuario agregado');
        this.cancel();
        this.saving.set(false);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  edit(member: Member): void {
    this.editing.set(member);
    this.form.setValue({ name: member.name, email: member.email });
    document.getElementById('name')?.focus();
  }

  cancel(): void {
    this.editing.set(null);
    this.form.reset({ name: '', email: '' });
  }

  remove(member: Member): void {
    if (!confirm(`¿Eliminar a ${member.name}?`)) {
      return;
    }
    this.api.deleteMember(member.id).subscribe({
      next: () => { this.notify.ok('Usuario eliminado'); this.load(); },
    });
  }
}
