import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Book } from '../core/models';
import { NotifyService } from '../core/notify.service';

@Component({
  selector: 'app-books-page',
  imports: [ReactiveFormsModule],
  template: `
    <h1>Libros</h1>

    <section class="card" aria-labelledby="form-title">
      <h2 id="form-title">{{ editing() ? 'Editar libro' : 'Nuevo libro' }}</h2>
      <form [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="grid">
          <div>
            <label for="title">Título</label>
            <input id="title" formControlName="title" [class.invalid]="invalid('title')" [attr.aria-invalid]="invalid('title')" />
            @if (invalid('title')) { <p class="error">El título es obligatorio.</p> }
          </div>
          <div>
            <label for="author">Autor</label>
            <input id="author" formControlName="author" [class.invalid]="invalid('author')" [attr.aria-invalid]="invalid('author')" />
            @if (invalid('author')) { <p class="error">El autor es obligatorio.</p> }
          </div>
          <div>
            <label for="genre">Género</label>
            <input id="genre" formControlName="genre" [class.invalid]="invalid('genre')" [attr.aria-invalid]="invalid('genre')" />
            @if (invalid('genre')) { <p class="error">El género es obligatorio.</p> }
          </div>
          <div>
            <label for="copies">Ejemplares</label>
            <input id="copies" type="number" min="1" formControlName="totalCopies" [class.invalid]="invalid('totalCopies')" [attr.aria-invalid]="invalid('totalCopies')" />
            @if (invalid('totalCopies')) { <p class="error">Debe haber al menos 1 ejemplar.</p> }
          </div>
        </div>
        <div class="actions">
          <button class="primary" type="submit" [disabled]="saving()">{{ editing() ? 'Guardar cambios' : 'Agregar libro' }}</button>
          @if (editing()) { <button type="button" (click)="cancel()">Cancelar</button> }
        </div>
      </form>
    </section>

    <section class="card" aria-labelledby="list-title">
      <h2 id="list-title">Catálogo</h2>
      <label for="search" class="sr-only">Buscar</label>
      <input id="search" type="search" placeholder="Buscar por título, autor o género" [value]="query()" (input)="onSearch($any($event.target).value)" />

      @if (loading()) {
        <p class="empty">Cargando…</p>
      } @else if (books().length === 0) {
        <p class="empty">No hay libros para mostrar.</p>
      } @else {
        <div class="table-wrap">
          <table>
            <caption class="sr-only">Lista de libros</caption>
            <thead><tr><th>Título</th><th>Autor</th><th>Género</th><th>Disponibles</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              @for (b of books(); track b.id) {
                <tr>
                  <td>{{ b.title }}</td>
                  <td>{{ b.author }}</td>
                  <td>{{ b.genre }}</td>
                  <td>{{ b.availableCopies }} / {{ b.totalCopies }}</td>
                  <td><span class="badge" [class.ok]="b.available" [class.bad]="!b.available">{{ b.available ? 'Disponible' : 'Prestado' }}</span></td>
                  <td>
                    <button type="button" (click)="edit(b)" [attr.aria-label]="'Editar ' + b.title">Editar</button>
                    <button type="button" class="danger" (click)="remove(b)" [attr.aria-label]="'Eliminar ' + b.title">Eliminar</button>
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
export class BooksPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private searchTimer?: ReturnType<typeof setTimeout>;

  readonly books = signal<Book[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal<Book | null>(null);
  readonly query = signal('');

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    author: ['', [Validators.required, Validators.maxLength(150)]],
    genre: ['', [Validators.required, Validators.maxLength(80)]],
    totalCopies: [1, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.load();
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  onSearch(value: string): void {
    this.query.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 250);
  }

  load(): void {
    this.loading.set(true);
    this.api.listBooks(this.query()).subscribe({
      next: books => { this.books.set(books); this.loading.set(false); },
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
    const request = current ? this.api.updateBook(current.id, value) : this.api.createBook(value);
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.notify.ok(current ? 'Libro actualizado' : 'Libro agregado');
        this.cancel();
        this.saving.set(false);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  edit(book: Book): void {
    this.editing.set(book);
    this.form.setValue({ title: book.title, author: book.author, genre: book.genre, totalCopies: book.totalCopies });
    document.getElementById('title')?.focus();
  }

  cancel(): void {
    this.editing.set(null);
    this.form.reset({ title: '', author: '', genre: '', totalCopies: 1 });
  }

  remove(book: Book): void {
    if (!confirm(`¿Eliminar «${book.title}»?`)) {
      return;
    }
    this.api.deleteBook(book.id).subscribe({
      next: () => { this.notify.ok('Libro eliminado'); this.load(); },
    });
  }
}
