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
service/     Reglas de negocio y transacciones
repository/  Acceso a datos (Spring Data JPA)
domain/      Entidades con su propio comportamiento (Book.borrowCopy, Loan.isOverdue…)
dto/         Contratos de entrada/salida de la API (records)
exception/   Errores de negocio y manejo global -> respuestas JSON uniformes
```

Decisiones: las entidades nunca se exponen directamente (DTOs), el reloj se inyecta (`Clock`)
para poder probar fechas, y los errores devuelven `{status, message, fields?}`
con 400 (validación), 404 (no existe) o 409 (regla de negocio).

## Reglas de préstamos

- Plazo de **14 días**.
- Máximo **3 préstamos activos** por usuario.
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
