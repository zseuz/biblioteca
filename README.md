# Sistema de Biblioteca

Prueba técnica JR Developer: CRUD de libros, gestión de préstamos y estadísticas.

- **Backend:** Spring Boot 4 (Java 21+), Spring Data JPA, H2 (archivo local), Bean Validation.
- **Frontend:** Angular 22 (standalone components, signals, formularios reactivos).

## Cómo ejecutarlo

Requisitos: JDK 21+ y Node 20+. No hace falta instalar Maven ni una base de datos.

```bash
# Terminal 1: API en http://localhost:8080
cd backend
./mvnw spring-boot:run        # en Windows (cmd/PowerShell): mvnw.cmd spring-boot:run

# Terminal 2: web en http://localhost:4200
cd frontend
npm install
npm start
```

Al primer arranque se cargan datos de ejemplo (6 libros, 3 usuarios, algunos préstamos).
La base se guarda en `backend/data/` (ignorada por git); bórrala para reiniciar los datos.

## Tests

```bash
cd backend && ./mvnw test
cd frontend && npm test -- --watch=false
```

## Arquitectura (backend)

```
web/         Controladores REST (solo HTTP: validan y delegan)
service/     Casos de uso y transacciones; devuelven DTOs, nunca entidades
repository/  Acceso a datos (Spring Data JPA, consultas JPQL con fetch join y proyecciones)
domain/      Entidades que protegen sus invariantes (Book.borrowCopy, Loan.markReturned…)
dto/         Contratos de entrada/salida de la API (records validados)
config/      Parámetros de negocio tipados y validados (LibraryProperties)
exception/   Errores de negocio y manejo global -> respuestas JSON uniformes
```

### Decisiones técnicas

- **DTOs mapeados dentro de la transacción** y `open-in-view=false`: la capa web nunca toca
  entidades, así que no hay `LazyInitializationException` ni consultas ocultas al serializar.
- **Sin N+1:** el historial de préstamos se carga con `join fetch`, y las relaciones perezosas
  se agrupan por lotes (`default_batch_fetch_size`).
- **Estadísticas en la BD:** `COUNT/GROUP BY` con `LIMIT` y proyección directa a `StatEntry`;
  no se cargan entidades en memoria.
- **Índices** sobre las columnas que usan las reglas y los informes (préstamos activos por
  usuario, por libro y vencidos).
- **Concurrencia:** `@Version` (bloqueo optimista) en `Book` y `Loan`. Dos préstamos simultáneos
  del último ejemplar, o una doble devolución, terminan en 409 en lugar de corromper el stock.
  El correo único se garantiza también con una restricción en la BD.
- **Reglas configurables** (`library.loans.days`, `library.loans.max-active`), validadas al
  arrancar; también se pueden fijar con variables de entorno.
- **Reloj inyectado (`Clock`)** para tests deterministas con fechas.
- **Errores uniformes** `{timestamp, status, message, path, fields?}`: 400 (validación o JSON
  mal formado), 404, 409 (regla de negocio o concurrencia) y 500 genérico sin filtrar detalles
  internos (la traza completa va al log).
- **Operación:** `/actuator/health` (con *probes* de liveness y readiness), apagado ordenado,
  compresión de respuestas JSON y logs de los eventos de negocio.

### Pruebas

- Unitarias (dominio y `LoanService`, con mocks y reloj fijo): cada regla por separado.
- Integración (`LibraryApiIntegrationTest`, MockMvc + H2): HTTP → JPA de extremo a extremo,
  con la misma configuración que producción (`open-in-view=false`).

### Siguientes pasos para producción

Migraciones con Flyway en lugar de `ddl-auto`, PostgreSQL, paginación del historial de
préstamos, autenticación (Spring Security + JWT) y documentación OpenAPI.

## Reglas de préstamos

- Plazo de **14 días** (configurable).
- Máximo **3 préstamos activos** por usuario (configurable).
- Un usuario con **préstamos vencidos** no puede pedir más libros.
- Solo se presta si hay **ejemplares disponibles** (cada libro tiene total y disponibles).
- No se puede eliminar un libro o usuario que tenga historial de préstamos.
- No se puede reducir el total de ejemplares por debajo de los que están prestados.

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/books?q=` | Lista/busca por título, autor o género |
| POST / PUT / DELETE | `/api/books[/{id}]` | Alta, edición, baja |
| GET, POST, PUT, DELETE | `/api/members[/{id}]` | CRUD de usuarios |
| GET | `/api/loans` | Historial (estado: ACTIVE, OVERDUE, RETURNED) |
| POST | `/api/loans` | Prestar `{bookId, memberId}` |
| POST | `/api/loans/{id}/return` | Registrar devolución |
| GET | `/api/stats` | Estadísticas |

## Estadísticas propuestas

Totales (libros, usuarios, préstamos activos y vencidos), **libros más prestados**,
**préstamos por género** y **usuarios más activos**. Responden a preguntas reales de una
biblioteca: qué comprar más, qué géneros interesan y a quién hay que reclamar devoluciones.

## Frontend

Rutas: `/libros`, `/usuarios`, `/prestamos`, `/estadisticas` (carga diferida).
Validaciones en formularios, un interceptor HTTP que traduce los errores de la API a mensajes
claros (incluido "servidor apagado"), diseño responsivo, etiquetas asociadas a cada campo,
navegación por teclado, foco visible, enlace "saltar al contenido" y avisos con `aria-live`.

## Flujo de Git

`main` + ramas `feature/*` fusionadas con `--no-ff`, commits pequeños y descriptivos (Conventional Commits).
