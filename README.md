# Banking API

API REST desarrollada con **NestJS + TypeScript + SQL Server** para la gestión de cuentas bancarias, transferencias atómicas, movimientos, estados de cuenta y procesamiento masivo de transferencias mediante archivos CSV.

La solución pone especial énfasis en la **consistencia financiera bajo concurrencia**, utilizando transacciones SQL Server, bloqueo pesimista, orden determinístico de locks, idempotencia y manejo de deadlocks.

También incluye autenticación mediante **JWT**, autorización basada en roles, documentación **Swagger/OpenAPI**, generación de estados de cuenta en PDF y scripts para reproducir escenarios de concurrencia y volumen.

---

## 1. Tecnologías

### Backend

- Node.js 20+
- NestJS
- TypeScript
- TypeORM
- SQL Server
- `decimal.js`
- JWT / Passport
- bcrypt
- class-validator / class-transformer
- Swagger / OpenAPI
- PDFKit
- csv-parse
- Vitest

### Infraestructura

- Docker
- Docker Compose
- SQL Server ejecutado en contenedor durante desarrollo

---

## 2. Funcionalidades principales

La API implementa:

- Creación y consulta de cuentas.
- Consulta de balance.
- Consulta de movimientos con filtros y paginación.
- Transferencias bancarias atómicas.
- Protección ante transferencias concurrentes sobre una misma cuenta.
- Idempotencia de transferencias.
- Procesamiento batch de transferencias mediante CSV.
- Seguimiento del progreso de procesos batch.
- Registro individual de operaciones exitosas y fallidas.
- Generación de datos de volumen.
- Estados de cuenta mensuales.
- Exportación de estados de cuenta a PDF.
- Autenticación JWT.
- Autorización mediante roles `ADMIN` y `USER`.
- Documentación Swagger/OpenAPI.

---

# 3. Requisitos

- **Node.js 20+**
- **Docker Desktop**
- npm

SQL Server se ejecuta mediante Docker para el entorno local.

---

# 4. Configuración inicial

Instalar las dependencias:

```bash
npm install
```

Crear el archivo de variables de entorno:

```bash
cp .env.example .env
```

En Windows también puede copiarse manualmente `.env.example` como `.env`.

Configura las variables correspondientes en `.env`.

La contraseña utilizada en:

```env
MSSQL_SA_PASSWORD
DB_PASSWORD
```

debe ser la misma.

SQL Server exige una contraseña suficientemente fuerte, con mayúsculas, minúsculas, números y símbolos.

---

# 5. SQL Server con Docker

El proyecto utiliza SQL Server mediante Docker Compose.

Por defecto, SQL Server se expone en el host mediante:

```text
localhost:14333
```

mapeado al puerto interno:

```text
1433
```

del contenedor.

Esto evita conflictos con una instalación local de SQL Server en Windows que ya esté utilizando el puerto `1433`.

## Levantar SQL Server

```bash
docker compose up -d
```

Comprobar el estado:

```bash
docker compose ps
```

Ver los logs:

```bash
docker compose logs -f sqlserver
```

Es importante esperar a que el healthcheck del contenedor indique:

```text
healthy
```

antes de ejecutar migraciones o iniciar la aplicación.

## Detener SQL Server sin borrar datos

```bash
docker compose stop
```

## Bajar contenedor y red

```bash
docker compose down
```

El volumen de SQL Server persiste, por lo que los datos no se eliminan.

---

# 6. Crear la base de datos

La base utilizada por defecto es:

```text
banking
```

Debe crearse solamente la primera vez si todavía no existe.

Ejemplo:

```bash
docker exec -it banking-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "%DB_PASSWORD%" -C -Q "IF DB_ID('banking') IS NULL CREATE DATABASE banking;"
```

En PowerShell puede utilizarse directamente la contraseña configurada en `.env`:

```powershell
docker exec -it banking-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "ChangeMe_StrongPass1" -C -Q "IF DB_ID('banking') IS NULL CREATE DATABASE banking;"
```

> Sustituir `ChangeMe_StrongPass1` por la contraseña configurada localmente.

---

# 7. Migraciones

El proyecto utiliza **TypeORM migrations**.

La sincronización automática está deshabilitada:

```text
synchronize: false
```

Las migraciones se ejecutan mediante `tsx` utilizando:

```text
src/database/data-source.ts
```

## Comandos

| Comando | Descripción |
|---|---|
| `npm run migration:show` | Muestra migraciones aplicadas y pendientes |
| `npm run migration:run` | Ejecuta las migraciones pendientes |
| `npm run migration:revert` | Revierte la última migración |
| `npm run migration:generate -- src/database/migrations/NombreCambio` | Genera una migración a partir de diferencias entre entidades y BD |
| `npm run typeorm -- migration:create src/database/migrations/NombreCambio` | Crea una migración vacía |

Después de levantar SQL Server y crear la base:

```bash
npm run migration:run
```

---

# 8. Seeds

El proyecto incluye diferentes scripts de seed con objetivos separados.

## Datos demo

```bash
npm run seed:demo
```

Crea o restablece dos cuentas de demostración con balance disponible para probar las funcionalidades de la aplicación:

| Número de cuenta | Titular | Balance inicial |
|---|---|---:|
| `1000000011` | Cuenta Demo Origen | RD$10,000.0000 |
| `1000000012` | Cuenta Demo Destino | RD$5,000.0000 |

El script es idempotente respecto a estas cuentas: si ya existen, restablece sus datos y balances en lugar de crear cuentas duplicadas.

Estas cuentas permiten probar transferencias inmediatamente después de preparar el entorno, mientras que las cuentas creadas normalmente mediante la API comienzan con balance `0`.

> **Nota:** `seed:demo` restablece los datos y balances de las cuentas demo, pero no elimina las transferencias ni los movimientos existentes asociados a ellas. Por lo tanto, está pensado para preparar datos de demostración y no como un mecanismo de reinicio completo del historial financiero.

## Roles

```bash
npm run seed:roles
```

Crea de forma idempotente los roles:

```text
ADMIN
USER
```

## Primer administrador

Después de crear los roles:

```bash
npm run seed:admin
```

Este script crea el administrador inicial utilizando las variables de entorno configuradas para el usuario administrador.

La contraseña se almacena utilizando **bcrypt** y nunca se persiste en texto plano.

El flujo inicial recomendado es:

```bash
npm run migration:run
npm run seed:roles
npm run seed:admin
npm run seed:demo
```

---

# 9. Ejecutar la API

## Desarrollo

```bash
npm run start:dev
```

## Compilar

```bash
npm run build
```

## Producción

```bash
npm run start:prod
```

Por defecto, la API utiliza el puerto configurado mediante:

```env
PORT
```

con `3000` como valor habitual de desarrollo.

---

# 10. Autenticación y autorización

La API utiliza autenticación mediante **JWT Bearer Token**.

El token contiene información necesaria para identificar al usuario y su rol.

Los roles disponibles son:

```text
ADMIN
USER
```

## Registro

El registro público crea siempre usuarios con:

```text
role = USER
status = ACTIVE
```

El cliente no puede elegir el rol durante el registro.

Esto evita que un usuario pueda registrarse directamente como administrador.

## Primer ADMIN

El primer administrador del sistema se crea mediante:

```bash
npm run seed:admin
```

Posteriormente, un administrador autenticado puede modificar el rol de otros usuarios.

La API también evita degradar al último administrador existente, para impedir que el sistema quede sin usuarios con privilegios administrativos.

## Autorización

Las operaciones protegidas utilizan:

- `JwtAuthGuard`
- `RolesGuard`
- `@Roles(...)`

Las acciones administrativas, como creación de determinadas entidades o procesamiento de lotes, se restringen al rol `ADMIN`.

Las consultas y operaciones permitidas a usuarios normales pueden utilizarse con `USER`.

---

# 11. Swagger / OpenAPI

La API está documentada mediante **Swagger/OpenAPI**.

Con la aplicación ejecutándose, la documentación está disponible en:

http://localhost:3000/api/docs

Desde Swagger se pueden consultar:

- endpoints;
- parámetros;
- request DTOs;
- response DTOs;
- códigos HTTP;
- autenticación Bearer.

Para probar endpoints protegidos, primero debe iniciarse sesión y proporcionar el JWT mediante la opción **Authorize** de Swagger.

---

# 12. Modelo de datos

Las principales tablas son:

### `accounts`

Representa las cuentas bancarias.

Contiene, entre otros:

- número de cuenta;
- titular;
- moneda;
- balance;
- estado.

Los valores monetarios se almacenan utilizando:

```text
decimal(19,4)
```

### `transfers`

Registra las transferencias.

Incluye:

- cuenta origen;
- cuenta destino;
- monto;
- estado;
- referencia;
- idempotency key;
- fecha de creación/finalización;
- información de fallo cuando corresponde.

### `account_movements`

Representa el historial financiero de una cuenta.

Cada movimiento registra:

- cuenta;
- transferencia relacionada;
- tipo de movimiento;
- monto;
- balance anterior;
- balance posterior;
- fecha.

### `batch_processes`

Representa un proceso de importación/procesamiento de transferencias por lote.

Mantiene el estado y progreso general del proceso.

### `batch_transfer_items`

Representa cada operación individual perteneciente a un batch.

Permite identificar:

- operaciones procesadas;
- operaciones exitosas;
- operaciones fallidas;
- errores individuales.

### `roles`

Contiene los roles de autorización.

Actualmente:

```text
ADMIN
USER
```

### `users`

Contiene los usuarios autenticables del sistema y su relación con un rol.

---

# 13. Manejo de valores monetarios

Los valores monetarios utilizan:

```text
decimal(19,4)
```

en SQL Server.

En la aplicación se evita utilizar aritmética financiera mediante `JavaScript Number`.

Para operaciones monetarias se utiliza:

```text
decimal.js
```

y los valores monetarios se mantienen como strings cuando atraviesan las diferentes capas de la aplicación.

Esto evita errores derivados de la representación de números de punto flotante.

---

# 14. Transferencias atómicas

Una transferencia modifica simultáneamente:

1. balance de la cuenta origen;
2. balance de la cuenta destino;
3. registro de la transferencia;
4. movimiento `DEBIT` de la cuenta origen;
5. movimiento `CREDIT` de la cuenta destino.

Estas operaciones se realizan dentro de una **transacción SQL Server**.

Por tanto:

```text
COMMIT
```

ocurre solamente si toda la operación es válida.

Ante cualquier error:

```text
ROLLBACK
```

evita dejar balances o movimientos parcialmente actualizados.

---

# 15. Control de concurrencia

Uno de los escenarios centrales de la solución es impedir inconsistencias cuando múltiples transferencias intentan utilizar simultáneamente el balance de una misma cuenta.

La implementación utiliza **bloqueo pesimista en SQL Server**.

Las cuentas involucradas se bloquean mediante una consulta equivalente a:

```sql
SELECT id, balance, status
FROM accounts WITH (UPDLOCK, ROWLOCK, HOLDLOCK)
WHERE id IN (@sourceAccountId, @destinationAccountId)
ORDER BY id;
```

## Locks utilizados

### `UPDLOCK`

Solicita locks de actualización desde la lectura inicial, evitando que dos transacciones lean el mismo balance y posteriormente intenten actualizarlo como si ambas dispusieran de los mismos fondos.

### `HOLDLOCK`

Mantiene los locks durante la transacción y proporciona el comportamiento requerido para proteger la lectura utilizada para tomar la decisión financiera.

### `ROWLOCK`

Solicita granularidad a nivel de fila cuando SQL Server lo considera posible.

## Orden determinístico

Las cuentas se bloquean utilizando:

```sql
ORDER BY id
```

Esto garantiza que diferentes transferencias intenten adquirir los locks de las cuentas en el mismo orden, reduciendo la probabilidad de deadlocks.

---

# 16. Manejo de deadlocks

Aunque se utiliza un orden determinístico para reducirlos, una aplicación concurrente debe asumir que SQL Server todavía puede detectar un deadlock.

SQL Server identifica este escenario mediante el error:

```text
1205
```

La transferencia implementa reintentos limitados de la transacción completa.

Los retrasos utilizados son:

```text
50 ms
100 ms
200 ms
```

con un máximo de tres reintentos.

La operación completa se vuelve a ejecutar porque después de un deadlock no debe asumirse que el estado previamente leído sigue siendo válido.

---

# 17. Idempotencia

Las transferencias utilizan una:

```text
idempotencyKey
```

para evitar procesar accidentalmente la misma operación más de una vez.

Esto es especialmente importante en:

- reintentos del cliente;
- procesamiento batch;
- errores temporales;
- escenarios donde una solicitud puede repetirse.

Una solicitud repetida con la misma clave puede identificarse sin ejecutar nuevamente una transferencia financiera equivalente.

---

# 18. Caso obligatorio de concurrencia

El proyecto incluye un script específico para demostrar el escenario de concurrencia.

El escenario es:

```text
Balance inicial cuenta origen: RD$10,000

Transferencia A: RD$8,000
Transferencia B: RD$7,000
```

Ambas transferencias se envían **simultáneamente** contra la misma cuenta origen.

Matemáticamente:

```text
8,000 + 7,000 = 15,000
```

por lo que ambas no pueden ser aprobadas contra un balance disponible de RD$10,000.

## Ejecutar la prueba

Primero debe estar ejecutándose la API:

```bash
npm run start:dev
```

En otra terminal:

```bash
npm run test:concurrency:example
```

El script:

1. obtiene autenticación contra la API;
2. prepara las cuentas necesarias para el escenario;
3. crea una cuenta origen con RD$10,000;
4. lanza una transferencia de RD$8,000;
5. lanza una transferencia de RD$7,000;
6. ambas solicitudes se envían concurrentemente;
7. consulta los balances finales;
8. valida el resultado.

## Resultado esperado

Debe aprobarse **exactamente una** transferencia.

Si gana la transferencia de RD$8,000:

```text
Balance final origen: RD$2,000
```

Si gana la transferencia de RD$7,000:

```text
Balance final origen: RD$3,000
```

La otra transferencia debe rechazarse por fondos insuficientes.

Nunca deben producirse:

```text
balance negativo
doble aprobación
actualización parcial
movimientos financieros incompletos
```

El script reporta `PASS` cuando se mantiene esta consistencia.

---

# 19. Movimientos

La API permite consultar movimientos de una cuenta con:

- paginación;
- fecha desde;
- fecha hasta;
- tipo de movimiento;
- monto mínimo;
- monto máximo.

La consulta se ejecuta en SQL Server y no carga el historial completo en memoria.

Los resultados se ordenan de manera determinística para soportar navegación paginada.

---

# 20. Volumen de datos

El proyecto incluye un script específico para generar volumen de movimientos.

Ejecutar:

```bash
npm run seed:volume
```

El objetivo es generar al menos:

```text
200,000 movimientos bancarios
```

para evaluar las consultas bajo un volumen de datos considerable.

La generación se realiza en batches para evitar mantener cientos de miles de objetos simultáneamente en memoria.

Los datos de carga generados por este script están destinados principalmente a pruebas de:

- filtros;
- paginación;
- índices;
- rendimiento de consultas;
- análisis del execution plan.

---

# 21. Índices y consultas

Se definieron índices sobre campos utilizados frecuentemente para:

- localizar cuentas;
- consultar movimientos de una cuenta;
- ordenar movimientos por fecha;
- filtrar por tipo;
- localizar transferencias;
- garantizar unicidad de referencias e idempotency keys.

Las consultas de movimientos utilizan paginación desde SQL Server en lugar de recuperar todo el conjunto y paginar en memoria.

Durante las pruebas se analizaron los **Execution Plans de SQL Server** para comprobar el comportamiento de las consultas bajo volumen.

---

# 22. Procesamiento batch de transferencias

La API permite procesar archivos CSV de transferencias.

El tamaño máximo contemplado es:

```text
10,000 transferencias por archivo
```

El flujo general es:

```text
CSV
 ↓
Validación
 ↓
Creación de BatchProcess
 ↓
Procesamiento
 ↓
BatchTransferItems
 ↓
Actualización de progreso
 ↓
COMPLETED / resultado final
```

La petición de carga no necesita mantener abierta la conexión HTTP hasta que terminen las 10,000 operaciones.

El proceso mantiene información de:

- total de operaciones;
- operaciones procesadas;
- operaciones exitosas;
- operaciones fallidas;
- estado general;
- errores individuales.

---

# 23. Generar CSV de 10,000 transferencias

Para generar el archivo utilizado en las pruebas de rendimiento/batch:

```bash
npm run generate:performance
```

Este script genera el CSV utilizado para probar el procesamiento de hasta 10,000 transferencias.

Posteriormente el archivo puede cargarse utilizando el endpoint batch correspondiente.

---

# 24. Estrategia batch

El procesamiento por lote:

- valida el archivo recibido;
- registra un proceso;
- divide el trabajo en grupos manejables;
- reutiliza la lógica de transferencia existente;
- mantiene progreso;
- registra éxito o fallo por operación;
- continúa procesando cuando una operación individual falla;
- utiliza idempotencia para evitar duplicidades;
- aplica reintentos donde corresponde.

Las operaciones batch reutilizan las mismas reglas financieras de las transferencias individuales.

Por tanto, una transferencia proveniente de CSV no puede evitar:

- validación de balance;
- locking;
- transacción;
- idempotencia;
- reglas de estado de cuenta.

---

# 25. Consideraciones de rendimiento del batch

El procesamiento de transferencias financieras concurrentes prioriza **consistencia sobre throughput**.

Las transferencias que utilizan las mismas cuentas generan naturalmente mayor contención debido a los locks requeridos para proteger los balances.

Por este motivo, el rendimiento depende significativamente de la distribución de cuentas contenida en el archivo.

Archivos con transferencias distribuidas entre múltiples cuentas permiten mayor paralelismo que archivos donde miles de operaciones compiten por las mismas cuentas.

---

# 26. Estado de cuenta

La API permite generar estados de cuenta mensuales.

El estado incluye:

- información de la cuenta;
- período;
- total de créditos;
- total de débitos;
- movimientos correspondientes al período;
- paginación para la respuesta JSON.

Los límites temporales se manejan como un intervalo:

```text
[from, to)
```

donde el inicio del mes es inclusivo y el inicio del mes siguiente es exclusivo.

---

# 27. Estado de cuenta PDF

También puede generarse el estado de cuenta en formato PDF.

La generación utiliza:

```text
PDFKit
```

El documento incluye los movimientos del período y soporta múltiples páginas cuando el número de registros supera el espacio disponible.

---

# 28. Procesos batch y cuentas en frontend

La API dispone de endpoints ligeros de opciones para que el frontend pueda presentar selectores amigables sin exigir que el usuario copie UUIDs manualmente.

Para cuentas, el frontend puede representar una opción como:

```text
accountNumber - holderName
```

mientras continúa enviando internamente el `id`.

Los procesos batch también pueden identificarse mediante su nombre de archivo y estado, manteniendo internamente el UUID correspondiente.

---

# 29. Tests

Ejecutar tests:

```bash
npm run test
```

Modo watch:

```bash
npm run test:watch
```

Coverage:

```bash
npm run test:cov
```

Tests E2E:

```bash
npm run test:e2e
```

La solución incluye pruebas sobre componentes críticos, incluyendo autenticación y reglas de usuario, además del script específico para reproducir el escenario obligatorio de concurrencia.

---


# 30. Inicialización completa desde cero

Una instalación nueva puede prepararse siguiendo este flujo:

```bash
npm install
```

Configurar:

```text
.env
```

Levantar SQL Server:

```bash
docker compose up -d
```

Crear la base `banking` si todavía no existe.

Ejecutar migraciones:

```bash
npm run migration:run
```

Crear roles:

```bash
npm run seed:roles
```

Crear el administrador inicial:

```bash
npm run seed:admin
```

Crear datos demo:

```bash
npm run seed:demo
```

Iniciar API:

```bash
npm run start:dev
```

Opcionalmente generar el volumen de datos:

```bash
npm run seed:volume
```

---

# 31. Scripts principales

| Comando | Propósito |
|---|---|
| `npm run start:dev` | Ejecuta la API en desarrollo |
| `npm run build` | Compila el proyecto |
| `npm run lint` | Ejecuta análisis estático |
| `npm run test` | Ejecuta tests |
| `npm run migration:run` | Ejecuta migraciones |
| `npm run migration:revert` | Revierte última migración |
| `npm run seed:roles` | Crea roles ADMIN/USER |
| `npm run seed:admin` | Crea administrador inicial |
| `npm run seed:demo` | Genera datos demo |
| `npm run seed:volume` | Genera volumen de movimientos |
| `npm run test:concurrency:example` | Ejecuta la demostración del caso obligatorio de concurrencia |
| `npm run generate:batch` | Genera CSV batch |
| `npm run generate:performance` | Genera CSV de 10,000 transferencias para prueba de rendimiento |

---

# 32. Decisiones técnicas principales

## SQL Server

Se utiliza SQL Server por requerimiento de la solución.

## TypeORM con migraciones

La base no depende de `synchronize`.

Esto permite reproducir el esquema de forma controlada mediante migraciones.

## `decimal(19,4)`

Se utiliza para representar valores monetarios con precisión decimal.

## `decimal.js`

Evita realizar cálculos financieros mediante floating point de JavaScript.

## Transacciones explícitas

Las transferencias financieras se ejecutan dentro de una única transacción.

## Pessimistic locking

Se eligió bloqueo pesimista porque el escenario crítico implica múltiples operaciones compitiendo por el mismo balance.

La decisión financiera se realiza mientras las filas involucradas están protegidas mediante locks de SQL Server.

## Orden determinístico de locks

Reduce la probabilidad de deadlocks cuando múltiples transferencias involucran las mismas cuentas.

## Retry de deadlocks

El error `1205` se maneja mediante un número limitado de reintentos de la transacción completa.

## Idempotencia

Evita duplicar operaciones financieras debido a reintentos o solicitudes repetidas.

## Procesamiento batch

El batch reutiliza la misma lógica financiera que las transferencias individuales en lugar de implementar un segundo mecanismo de actualización de balances.

## Paginación server-side

Los movimientos se filtran y paginan directamente en SQL Server.

---

# 33. Limitaciones y posibles mejoras

La implementación prioriza los requisitos funcionales, consistencia financiera y reproducibilidad de la prueba técnica.

Algunas mejoras posibles para un entorno productivo serían:

- utilizar una cola persistente para el procesamiento batch;
- separar procesamiento batch en workers independientes;
- observabilidad y métricas;
- tracing distribuido;
- gestión centralizada de logs;
- políticas avanzadas de rate limiting;
- administración avanzada de usuarios;
- rotación/revocación avanzada de sesiones;
- almacenamiento externo de documentos/reportes si el volumen lo requiere.

Actualmente el procesamiento asíncrono de batch ocurre dentro del proceso de la aplicación. Para un entorno distribuido o de alta disponibilidad sería preferible utilizar una cola durable como mecanismo de ejecución.

---

# 34. Repositorio

El repositorio contiene:

```text
src/
  database/
    entities/
    migrations/
  accounts/
  transfers/
  batches/
  auth/
  users/

scripts/
  seed-demo.ts
  seed-volume.ts
  seed-roles.ts
  seed-admin.ts
  test-concurrency-example.ts
  generate-performance-csv.ts
```

La estructura exacta puede incluir módulos y archivos adicionales correspondientes a DTOs, mappers, guards, servicios y utilidades.

---

# 35. Licencia

```text
UNLICENSED
```

Proyecto privado desarrollado como solución de evaluación técnica.