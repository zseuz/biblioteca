<div align="center">

<img src="frontend/public/favicon.svg" width="72" alt="Logo de Biblioteca" />

# Sistema de Biblioteca

**Gestión de libros, usuarios y préstamos con reglas de negocio y panel de estadísticas.**

![Java](https://img.shields.io/badge/Java-21%2B-orange?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1-6DB33F?logo=springboot&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![H2](https://img.shields.io/badge/Base%20de%20datos-H2-1E3A8A)
![Tests](https://img.shields.io/badge/tests-95%20en%20verde-success)

<img src="docs/img/estadisticas.jpg" alt="Panel de estadísticas" width="820" />

</div>

---

## Índice

1. [¿Qué hace la aplicación?](#qué-hace-la-aplicación)
2. [Capturas](#capturas)
3. [Requisitos previos](#requisitos-previos)
4. [Descargar el proyecto](#descargar-el-proyecto)
5. [Ponerlo en marcha paso a paso](#ponerlo-en-marcha-paso-a-paso)
6. [Comprobar que todo funciona](#comprobar-que-todo-funciona)
7. [Datos de ejemplo y registros de prueba](#datos-de-ejemplo-y-registros-de-prueba)
8. [Cómo funciona (diagramas)](#cómo-funciona-diagramas)
9. [Guía de uso por pantalla](#guía-de-uso-por-pantalla)
10. [Reglas de negocio y validaciones](#reglas-de-negocio-y-validaciones)
11. [API REST](#api-rest) · [Swagger](#documentación-interactiva-swagger)
12. [Pruebas automatizadas](#pruebas-automatizadas)
13. [Estructura del proyecto](#estructura-del-proyecto)
14. [Configuración](#configuración)
15. [Solución de problemas](#solución-de-problemas)

---

## ¿Qué hace la aplicación?

| Módulo | Funcionalidad |
|---|---|
| **Libros** | Alta, edición, baja y búsqueda por título, autor o género. Control de ejemplares totales y disponibles, filtros (disponibles / agotados), vista de tabla o tarjetas y préstamo rápido. **Detección de duplicados:** si el libro ya existe, ofrece sumar los ejemplares en vez de crear otro registro; si solo cambia el género, muestra la diferencia para confirmarla. |
| **Usuarios** | Alta, edición y baja con validación del nombre y del correo (único). Los usuarios con préstamos no se pueden eliminar y la interfaz lo explica antes de intentarlo. |
| **Préstamos** | Registro con buscador de usuarios, devolución, historial **paginado en el servidor** con filtros por estado, búsqueda y orden, y cálculo automático del vencimiento. |
| **Estadísticas** | Indicadores clave y gráficas: préstamos por mes, estado de los préstamos, libros más prestados, préstamos por género y usuarios más activos. |

Además: botones de guardar que **no cambian de tamaño** mientras cargan (el indicador solo aparece si la espera es perceptible), errores mostrados **en contexto** (junto al campo o dentro del diálogo), **tema claro / oscuro**, diseño **responsive** (escritorio, tableta y móvil) y accesibilidad (teclado, lectores de pantalla y vista de tabla para cada gráfica).

**Tecnologías:**

| Capa | Tecnología |
|---|---|
| Frontend | Angular 22 (componentes standalone, signals, formularios reactivos), TypeScript, CSS |
| Backend | Spring Boot 4.1 (Spring MVC, Spring Data JPA, Bean Validation, Actuator), springdoc-openapi (Swagger UI), Java 21 |
| Base de datos | H2 en archivo (no requiere instalar nada) |
| Pruebas | JUnit 5, Mockito, MockMvc (backend) · Vitest (frontend) |

---

## Capturas

| Catálogo de libros | Préstamos vencidos |
|---|---|
| <img src="docs/img/libros.jpg" alt="Catálogo de libros" /> | <img src="docs/img/prestamos-vencidos.jpg" alt="Préstamos vencidos" /> |
| **Validación del nombre de usuario** | **Estadísticas en modo oscuro** |
| <img src="docs/img/usuario-validacion.jpg" alt="Aviso de validación del nombre" /> | <img src="docs/img/estadisticas-oscuro.jpg" alt="Estadísticas en modo oscuro" /> |
| **Historial paginado (página 2 de 3)** | **Documentación de la API (Swagger UI)** |
| <img src="docs/img/prestamos-paginacion.jpg" alt="Historial de préstamos paginado" /> | <img src="docs/img/swagger.jpg" alt="Swagger UI con los endpoints de préstamos y usuarios" /> |
| **Libro ya registrado: sumar ejemplares** | **Mismo libro con otro género: confirmar** |
| <img src="docs/img/libro-duplicado.jpg" alt="Aviso de libro ya registrado" /> | <img src="docs/img/libro-otro-genero.jpg" alt="Comparación de género antes de crear" /> |

<p align="center">
  <img src="docs/img/movil-libros.jpg" alt="Vista móvil con el menú de acciones" width="300" /><br/>
  <em>Vista móvil: cada libro es una tarjeta y sus acciones están en el menú ⋮</em>
</p>

---

## Requisitos previos

Solo necesitas instalar **tres programas**. **No** hace falta instalar Maven ni ninguna base de datos: el proyecto trae el *Maven Wrapper* y usa H2 embebida.

| Software | Versión | ¿Para qué? | Comprobar en una terminal | Descarga |
|---|---|---|---|---|
| **Git** | cualquiera reciente | Descargar el repositorio | `git --version` | [git-scm.com](https://git-scm.com/install/windows) |
| **JDK (Java)** | **21 o superior** | Compilar y ejecutar el backend | `java -version` | [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) |
| **Node.js** (incluye npm) | **22.22+** (LTS) o **24.15+** | Instalar y ejecutar el frontend | `node -v` y `npm -v` | [nodejs.org](https://nodejs.org/) |

> [!IMPORTANT]
> Angular 22 **no funciona con Node 20 ni con versiones antiguas de Node 22**. Si `node -v` muestra una versión inferior a `v22.22`, instala la última LTS.
>
> La **primera** ejecución necesita **conexión a Internet**: descarga Maven, las dependencias de Java y los paquetes de npm. Después funciona sin conexión.

Puertos que usa la aplicación (deben estar libres):

| Servicio | Puerto | URL |
|---|---|---|
| Backend (API) | `8080` | http://localhost:8080 · documentación en http://localhost:8080/swagger-ui.html |
| Frontend (web) | `4200` | http://localhost:4200 |

---

## Descargar el proyecto

**Opción A — con Git (recomendada):**

```bash
git clone https://github.com/zseuz/biblioteca.git
```

```bash
cd biblioteca
```

**Opción B — sin Git:** en la página del repositorio pulsa **Code → Download ZIP**, descomprímelo y abre una terminal dentro de la carpeta `biblioteca`.

---

## Ponerlo en marcha paso a paso

La aplicación tiene dos partes que se ejecutan **a la vez, en dos terminales distintas**: primero el backend y después el frontend.

```mermaid
flowchart LR
    A["1. Instalar Git, JDK 21+ y Node 22.22+"] --> B["2. Clonar el repositorio"]
    B --> C["3. Terminal 1: arrancar el backend"]
    C --> D["4. Terminal 2: npm install"]
    D --> E["5. Terminal 2: npm start"]
    E --> F["6. Abrir http://localhost:4200"]
```

### Paso 1 — Backend (Terminal 1)

Entra en la carpeta del backend:

```bash
cd backend
```

Arráncalo según tu sistema operativo:

| Sistema | Comando |
|---|---|
| Windows (PowerShell) | `.\mvnw.cmd spring-boot:run` |
| Windows (CMD) | `mvnw.cmd spring-boot:run` |
| macOS / Linux | `./mvnw spring-boot:run` |

Está listo cuando la consola muestra:

```text
Tomcat started on port 8080 (http)
Started BibliotecaApplication in ... seconds
```

> La primera vez tarda unos minutos porque descarga Maven y las dependencias. **Deja esta terminal abierta.**

### Paso 2 — Frontend (Terminal 2)

Abre **otra** terminal en la carpeta del proyecto y entra en el frontend:

```bash
cd frontend
```

Instala las dependencias (solo la primera vez, o cuando cambie `package.json`):

```bash
npm install
```

Arranca el servidor de desarrollo:

```bash
npm start
```

Está listo cuando aparece:

```text
➜  Local:   http://localhost:4200/
```

### Paso 3 — Abrir la aplicación

Entra en **http://localhost:4200** con tu navegador.

### Detener la aplicación

Pulsa `Ctrl + C` en cada una de las dos terminales.

---

## Comprobar que todo funciona

| Qué comprobar | Cómo | Resultado esperado |
|---|---|---|
| El backend está vivo | Abrir http://localhost:8080/actuator/health | `{"status":"UP", ...}` |
| La API responde | Abrir http://localhost:8080/api/books | Lista de libros en JSON |
| Documentación de la API | Abrir http://localhost:8080/swagger-ui.html | Swagger UI con todos los endpoints |
| El frontend se conecta | Abrir http://localhost:4200 | Catálogo con 8 libros |
| Registros de prueba | Filtro **Agotados** en Libros y **Vencidos** en Préstamos | «1984» agotado y «Rayuela» vencido |

Si la web muestra *"No se pudo conectar con el servidor"*, el backend no está arrancado (revisa la Terminal 1).

---

## Datos de ejemplo y registros de prueba

En el **primer arranque** (base de datos vacía) se cargan automáticamente:

- **6 libros, 3 usuarios** y **seis meses de historial** de préstamos (devueltos, activos y uno vencido), para que las gráficas muestren tendencias desde el inicio. Las fechas son relativas al día actual.

En **cada arranque**, de forma idempotente (nunca se duplican), se garantizan dos **registros de prueba** asociados al usuario *Usuario de Prueba* (`prueba@biblioteca.test`):

| Registro | Situación | Dónde verlo |
|---|---|---|
| **«1984»** de George Orwell | Su único ejemplar está prestado → **Agotado** | Libros → filtro *Agotados* |
| **«Rayuela»** de Julio Cortázar | Prestado hace 20 días con plazo de 14 → **Vencido** | Préstamos → filtro *Vencidos* |

Los datos se guardan en `backend/data/` (no se sube a Git). **Para reiniciar la base de datos:** detén el backend, borra la carpeta `backend/data/` y vuelve a arrancarlo.

---

## Cómo funciona (diagramas)

### Arquitectura general

```mermaid
flowchart LR
    U(["Usuario"]) --> B["Navegador"]
    subgraph FE["Frontend · Angular 22 · puerto 4200"]
        P["Páginas<br/>Libros · Usuarios · Préstamos · Estadísticas"]
        S["ApiService"]
        I["Interceptor de errores"]
        P --> S --> I
    end
    subgraph BE["Backend · Spring Boot 4 · puerto 8080"]
        C["Controladores REST<br/>(validan la entrada)"]
        SV["Servicios<br/>(reglas de negocio y transacciones)"]
        R["Repositorios<br/>(Spring Data JPA)"]
        EH["Manejador global de errores"]
        C --> SV --> R
        C -.-> EH
    end
    DB[("H2<br/>backend/data")]
    SW["Swagger UI<br/>/swagger-ui.html"]
    B --> P
    I -- "HTTP + JSON" --> C
    SW -. "prueba la API" .-> C
    R --> DB
```

- El **frontend** es una aplicación de una sola página. Nunca habla con la base de datos; solo consume la API.
- El **backend** está organizado en capas: el controlador recibe la petición, el servicio aplica las reglas y el repositorio accede a los datos.
- Los errores se convierten siempre en un JSON uniforme, que el interceptor del frontend traduce a un mensaje claro.

### Modelo de datos

```mermaid
erDiagram
    BOOK ||--o{ LOAN : "se presta en"
    MEMBER ||--o{ LOAN : "realiza"
    BOOK {
        long id PK
        string title "máx. 200"
        string author "máx. 150"
        string genre "máx. 80"
        int totalCopies "mínimo 1"
        int availableCopies "0 = agotado"
        long version "bloqueo optimista"
    }
    MEMBER {
        long id PK
        string name "máx. 100"
        string email "único"
    }
    LOAN {
        long id PK
        long book_id FK
        long member_id FK
        date loanDate
        date dueDate "loanDate + 14 días"
        date returnDate "vacío mientras está activo"
        long version "bloqueo optimista"
    }
```

### Registrar un préstamo (secuencia completa)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant W as Angular
    participant API as LoanController
    participant S as LoanService
    participant DB as H2

    U->>W: Elige usuario y libro y pulsa «Prestar»
    W->>API: POST /api/loans con bookId y memberId
    API->>API: Valida el JSON (@Valid)
    API->>S: lend(request)
    S->>DB: Buscar libro y usuario
    alt Se cumplen todas las reglas
        S->>DB: Descontar un ejemplar y guardar el préstamo
        S-->>API: Préstamo (vence en 14 días)
        API-->>W: 201 Created
        W-->>U: «Préstamo registrado, vence el ...»
    else Se incumple una regla
        S-->>API: BusinessRuleException
        API-->>W: 409 Conflict con el motivo
        W-->>U: Mensaje explicando el motivo
    end
```

### Reglas que se comprueban al prestar

```mermaid
flowchart TD
    A["Solicitud de préstamo"] --> B{"¿Existen el libro<br/>y el usuario?"}
    B -- No --> X1["404 · No encontrado"]
    B -- Sí --> C{"¿Hay ejemplares<br/>disponibles?"}
    C -- No --> X2["409 · Libro agotado"]
    C -- Sí --> D{"¿El usuario tiene<br/>préstamos vencidos?"}
    D -- Sí --> X3["409 · Debe devolver primero"]
    D -- No --> E{"¿Tiene ya 3<br/>préstamos activos?"}
    E -- Sí --> X4["409 · Límite alcanzado"]
    E -- No --> OK["201 · Préstamo creado<br/>vence en 14 días"]
```

### Ciclo de vida de un préstamo

```mermaid
stateDiagram-v2
    [*] --> Activo: Se presta (se descuenta un ejemplar)
    Activo --> Vencido: Pasa la fecha límite sin devolverlo
    Activo --> Devuelto: Se devuelve (se repone el ejemplar)
    Vencido --> Devuelto: Se devuelve
    Devuelto --> [*]
```

> Mientras un usuario tenga un préstamo **vencido**, no puede pedir más libros.

### Historial de préstamos paginado

Filtros, búsqueda, orden y paginación se resuelven en el servidor. El navegador solo recibe la página que muestra.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant W as Angular
    participant API as LoanController
    participant DB as H2

    U->>W: Cambia filtro, orden o página, o escribe en el buscador
    Note over W: La búsqueda espera 300 ms sin teclear.<br/>Una consulta nueva cancela la anterior (switchMap).
    W->>API: GET /api/loans?status=OVERDUE&q=&sort=dueDate&direction=asc&page=0&size=10
    API->>API: Valida status, sort y direction (400 si no son válidos)
    API->>DB: Datos de la página (join fetch) y total
    DB-->>API: 10 filas + total de coincidencias
    API-->>W: content, page, size, totalElements, totalPages
    W-->>U: Tabla + «Mostrando 1–10 de N»
    W->>API: GET /api/loans/summary (al cargar y tras prestar o devolver)
    API-->>W: total, activos, vencidos, devueltos
    W-->>U: Contadores de pestañas e indicadores
```

### Registrar un libro (detección de duplicados)

```mermaid
flowchart TD
    A["Formulario «Nuevo libro» válido"] --> B["GET /api/books/duplicates<br/>título, autor y género"]
    B --> C{"¿Existe el mismo título,<br/>autor y género?"}
    C -- Sí --> D["Aviso «Este libro ya está registrado»<br/>con el total resultante"]
    D -- "Añadir N ejemplares" --> E["POST /api/books/{id}/copies<br/>(total y disponibles + N)"]
    D -- "Volver al formulario" --> A
    C -- No --> F{"¿Mismo título y autor<br/>con otro género?"}
    F -- Sí --> G["Comparación lado a lado<br/>con el género resaltado"]
    G -- "Sí, es correcto: crear" --> H["POST /api/books"]
    G -- "Revisar" --> A
    F -- No --> H
```

No se distinguen mayúsculas ni espacios sobrantes: «  cien años DE soledad » es el mismo libro que «Cien años de soledad». Aunque alguien llame a la API sin pasar por la interfaz, el backend rechaza con `409` crear o editar un libro idéntico a otro.

### Eliminar un usuario

```mermaid
flowchart TD
    A["Menú ⋮ → Eliminar"] --> B{"¿Tiene préstamos<br/>registrados?"}
    B -- Sí --> C["Aviso informativo:<br/>préstamos activos e historial<br/>(no se envía ninguna petición)"]
    B -- No --> D["Confirmación"]
    D --> E["DELETE /api/members/{id}"]
    E -- "204" --> F["Usuario eliminado"]
    E -- "409 (caso raro)" --> G["El motivo se muestra<br/>dentro del diálogo"]
```

### Validación del nombre de usuario

```mermaid
flowchart TD
    A["Escribir el nombre"] --> B{"¿Vacío o solo espacios?"}
    B -- Sí --> E1["Error: obligatorio"]
    B -- No --> C{"¿Más de 100 caracteres?"}
    C -- Sí --> E2["Error: máximo 100<br/>(el HTML no deja escribir más)"]
    C -- No --> D{"¿Tiene números o<br/>un solo carácter?"}
    D -- Sí --> W["Aviso + confirmación<br/>«¿El nombre es correcto?»"]
    D -- No --> OK["Se guarda"]
    W -- "Sí, registrar" --> OK
    W -- "Cancelar" --> A
```

---

## Guía de uso por pantalla

### Libros

- **Nuevo libro:** botón superior derecho. Todos los campos son obligatorios y debe haber al menos 1 ejemplar.
- **Buscar:** escribe en el buscador (título, autor o género). Combina la búsqueda con el filtro de género y con *Todos / Disponibles / Agotados*.
- **Ordenar:** haz clic en la cabecera de una columna.
- **Vista:** alterna entre tabla y tarjetas con los iconos de la derecha.
- **Libro repetido:** si registras un libro que ya existe (mismo título, autor y género), en lugar de duplicarlo se ofrece **sumar los ejemplares** que ibas a ingresar. Si solo cambia el género, se muestra la diferencia para que confirmes si es correcta o la corrijas.
- **Acciones (⋮):** *Prestar* (solo si hay ejemplares), *Editar* y *Eliminar*. Un libro con historial de préstamos no se puede eliminar.

### Usuarios

- **Nuevo usuario:** nombre (máx. 100 caracteres, con contador) y correo válido y único. Si el correo ya está registrado, se indica **junto al campo** (que recibe el foco) sin cerrar el formulario.
- Si el nombre contiene **números** o tiene **un solo carácter**, aparece un aviso y se pide confirmación antes de guardarlo.
- **Eliminar:** si el usuario tiene préstamos, se explica por qué no es posible, sin intentarlo.

### Préstamos

- **Registrar préstamo:** el campo de usuario es un buscador. Al hacer clic muestra a todos los usuarios y al escribir filtra por nombre o correo, sin importar mayúsculas ni tildes.
- **Filtros:** *Todos, Activos, Vencidos, Devueltos*, más una búsqueda por libro o usuario (se aplica al dejar de escribir). *Activos* son los que están **en plazo**; los que pasaron su fecha límite aparecen en *Vencidos*.
- **Ordenar:** haz clic en la cabecera de una columna (libro, usuario, fechas o estado).
- **Paginación:** abajo de la tabla se indica *Mostrando 11–20 de 21*, con botones de página y selector de 10, 20 o 50 por página. Filtros, búsqueda, orden y páginas se resuelven en el servidor.
- **Devolver:** menú ⋮ → *Registrar devolución* (solo en préstamos activos o vencidos).

### Estadísticas

- **Indicadores:** títulos, usuarios, préstamos activos y vencidos (este último se resalta en rojo si hay alguno).
- **Gráficas:** pasa el ratón (o navega con Tab) para ver el detalle. Cada tarjeta tiene un botón **Gráfica / Tabla** con los mismos datos en formato tabla.
- **Actualizar datos:** recarga el panel sin parpadeos.

---

## Reglas de negocio y validaciones

### Préstamos

| Regla | Valor | Configurable en |
|---|---|---|
| Plazo de devolución | 14 días | `library.loans.days` |
| Préstamos activos por usuario | máximo 3 | `library.loans.max-active` |
| Usuario con préstamos vencidos | no puede pedir más | — |
| Libro sin ejemplares disponibles | no se presta | — |

### Altas, bajas y ediciones

- No puede haber dos libros con el mismo **título, autor y género** (sin distinguir mayúsculas ni espacios): se suman ejemplares al existente. El mismo título y autor con **otro género** sí se permite, previa confirmación.

- No se puede eliminar un **libro** o un **usuario** con historial de préstamos (para conservar la trazabilidad).
- No se puede reducir el total de ejemplares de un libro por debajo de los que están prestados.
- El correo de un usuario es único (sin distinguir mayúsculas).

### Validación del nombre de usuario (en las tres capas)

| Capa | Regla |
|---|---|
| HTML | `required` y `maxlength="100"` |
| Angular | `required`, sin solo espacios y `maxLength(100)`, con contador de caracteres |
| Backend | `@NotBlank` y `@Size(max = 100)` → `400` con el mensaje del campo |

Los nombres con números o de un solo carácter **no se bloquean** (pueden ser legítimos): la interfaz avisa y pide confirmación.

---

## API REST

URL base: `http://localhost:8080/api`

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| `GET` | `/books?q=texto` | Lista o busca libros | 200 |
| `GET` | `/books/{id}` | Detalle de un libro | 200 · 404 |
| `POST` | `/books` | Crea un libro (409 si ya existe el mismo título, autor y género) | 201 · 400 · 409 |
| `PUT` | `/books/{id}` | Edita un libro | 200 · 400 · 404 · 409 |
| `DELETE` | `/books/{id}` | Elimina un libro sin historial | 204 · 404 · 409 |
| `GET` | `/books/duplicates?title=&author=&genre=` | Comprueba si ya existe: `sameBook` (idéntico) y `differentGenre` | 200 |
| `POST` | `/books/{id}/copies` | Suma ejemplares `{quantity}` (1-1000) a un libro existente | 200 · 400 · 404 |
| `GET` | `/members` | Lista usuarios con `activeLoans` y `totalLoans` | 200 |
| `POST` | `/members` | Crea un usuario | 201 · 400 · 409 |
| `PUT` | `/members/{id}` | Edita un usuario | 200 · 400 · 404 · 409 |
| `DELETE` | `/members/{id}` | Elimina un usuario sin historial | 204 · 404 · 409 |
| `GET` | `/loans?status=&q=&sort=&direction=&page=&size=` | Historial **paginado** (ver tabla de parámetros) | 200 · 400 |
| `GET` | `/loans/summary` | Contadores: total, activos, vencidos y devueltos | 200 |
| `POST` | `/loans` | Presta un libro `{bookId, memberId}` | 201 · 400 · 404 · 409 |
| `POST` | `/loans/{id}/return` | Registra la devolución | 200 · 404 · 409 |
| `GET` | `/stats` | Indicadores y series para las gráficas | 200 |

**Parámetros del historial paginado** (`GET /loans`):

| Parámetro | Valores | Por defecto |
|---|---|---|
| `status` | `ALL`, `ACTIVE` (en plazo), `OVERDUE` (vencido), `RETURNED` | `ALL` |
| `q` | Texto en el título del libro o el nombre del usuario | — |
| `sort` | `bookTitle`, `memberName`, `loanDate`, `dueDate`, `status` | `dueDate` |
| `direction` | `asc`, `desc` | `asc` |
| `page` | Número de página, desde 0 | `0` |
| `size` | Elementos por página (se acota entre 1 y 100) | `10` |

Respuesta:

```json
{
  "content": [ { "id": 7, "bookTitle": "Rayuela", "memberName": "Usuario de Prueba", "status": "OVERDUE", "...": "..." } ],
  "page": 0,
  "size": 10,
  "totalElements": 21,
  "totalPages": 3
}
```

**Ejemplo — crear un usuario:**

```bash
curl -X POST http://localhost:8080/api/members -H "Content-Type: application/json" -d "{\"name\":\"Laura Gomez\",\"email\":\"laura@example.com\"}"
```

**Formato de error** (igual en toda la API):

```json
{
  "timestamp": "2026-10-06T21:00:00Z",
  "status": 400,
  "message": "Datos inválidos",
  "path": "/api/members",
  "fields": { "name": "El nombre no puede superar los 100 caracteres" }
}
```

| Código | Significado |
|---|---|
| `400` | Datos inválidos (`fields` indica qué campo falla), JSON mal formado o parámetro no admitido (p. ej. `sort=password`) |
| `404` | El recurso no existe |
| `409` | Se incumple una regla de negocio o hubo un conflicto de concurrencia |
| `500` | Error inesperado (mensaje genérico; el detalle queda en el log del servidor) |

### Documentación interactiva (Swagger)

Con el backend en marcha, abre **http://localhost:8080/swagger-ui.html**. Ahí verás todos los endpoints agrupados (Libros, Usuarios, Préstamos, Estadísticas), con sus parámetros, los modelos de datos y los posibles errores, y podrás **probarlos desde el navegador** con *Try it out*. La especificación OpenAPI en JSON está en http://localhost:8080/v3/api-docs.

La documentación se genera a partir del propio código (controladores, DTOs y validaciones), así que siempre está sincronizada con la API.

---

## Pruebas automatizadas

| Proyecto | Comando | Qué cubre |
|---|---|---|
| Backend (45 tests) | `cd backend` y después `./mvnw test` (Windows: `.\mvnw.cmd test`) | Reglas del dominio, reglas de préstamo con reloj fijo, integración HTTP → JPA → H2, historial paginado (filtros, búsqueda, orden, páginas), detección de libros duplicados y **concurrencia real** (10 hilos compitiendo por el último ejemplar) |
| Frontend (50 tests) | `cd frontend` y después `npm test -- --watch=false` | Servicio de API, interceptor, páginas, validaciones, menú de acciones, buscador, paginador, consultas al servidor, aviso de libro duplicado y estados de carga de los botones |

Los tests del backend usan una base H2 **en memoria**, así que nunca modifican tus datos.

---

## Estructura del proyecto

```text
biblioteca/
├── backend/                         API REST (Spring Boot)
│   ├── mvnw, mvnw.cmd               Maven Wrapper (no hace falta instalar Maven)
│   ├── pom.xml                      Dependencias
│   └── src/
│       ├── main/java/com/biblioteca/
│       │   ├── web/                 Controladores REST
│       │   ├── service/             Casos de uso y reglas de negocio
│       │   ├── repository/          Acceso a datos (JPA) y búsqueda paginada (LoanSearchRepositoryImpl)
│       │   ├── domain/              Entidades: Book, Member, Loan
│       │   ├── dto/                 Contratos de entrada y salida de la API
│       │   ├── exception/           Errores y manejador global
│       │   ├── config/              Parámetros de negocio (LibraryProperties) y Swagger (OpenApiConfig)
│       │   └── DataSeeder.java      Datos de ejemplo y registros de prueba
│       ├── main/resources/application.properties
│       └── test/                    Tests unitarios y de integración
├── frontend/                        Aplicación web (Angular)
│   ├── public/favicon.svg           Icono de la aplicación
│   └── src/
│       ├── styles.css               Tema claro/oscuro y estilos globales
│       └── app/
│           ├── core/                ApiService, interceptor, modelos, validaciones
│           ├── pages/               Libros, Usuarios, Préstamos, Estadísticas
│           └── shared/              Modal, menú ⋮, buscador, paginador, gráficas, iconos
└── docs/img/                        Capturas usadas en este README
```

---

## Configuración

Ajustes principales en `backend/src/main/resources/application.properties`. Todos se pueden sobrescribir con variables de entorno, sin tocar el código:

| Propiedad | Por defecto | Variable de entorno | Descripción |
|---|---|---|---|
| `server.port` | `8080` | `SERVER_PORT` | Puerto de la API |
| `spring.datasource.url` | `jdbc:h2:file:./data/biblioteca` | `SPRING_DATASOURCE_URL` | Ubicación de la base de datos |
| `library.loans.days` | `14` | `LIBRARY_LOANS_DAYS` | Días de plazo de un préstamo |
| `library.loans.max-active` | `3` | `LIBRARY_LOANS_MAX_ACTIVE` | Préstamos activos por usuario |
| `app.cors.allowed-origins` | `http://localhost:4200` | `CORS_ALLOWED_ORIGINS` | Origen permitido para el frontend |
| `springdoc.swagger-ui.path` | `/swagger-ui.html` | `SPRINGDOC_SWAGGER_UI_PATH` | Ruta de la documentación interactiva |

La URL de la API que usa el frontend está en `frontend/src/app/core/api.service.ts` (`API_URL`).

---

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `java` no se reconoce como comando | JDK no instalado o fuera del PATH | Instala el JDK 21 o superior y abre una terminal nueva |
| `release version 21 not supported` | JDK anterior a 21 | Instala JDK 21 o superior y comprueba `java -version` |
| `./mvnw: Permission denied` (macOS/Linux) | El script no es ejecutable | `chmod +x mvnw` |
| `Port 8080 was already in use` | Otra instancia del backend sigue abierta | Ciérrala o cambia el puerto con `SERVER_PORT=8081` (y `API_URL` en el frontend) |
| `npm install` falla o `ng` exige otra versión de Node | Node antiguo | Instala Node 22.22+ LTS o 24.15+ |
| La web dice *"No se pudo conectar con el servidor"* | El backend no está arrancado | Arranca el backend (Terminal 1) y recarga la página |
| Error de CORS en la consola del navegador | El frontend usa otro puerto u origen | Ajusta `CORS_ALLOWED_ORIGINS` |
| Quiero empezar con los datos de ejemplo limpios | — | Detén el backend, borra `backend/data/` y arráncalo de nuevo |
| Las gráficas aparecen vacías | Base de datos sin historial | Registra préstamos o reinicia los datos de ejemplo |
