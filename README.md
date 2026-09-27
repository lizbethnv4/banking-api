# Banking API

API REST de cuentas y transferencias bancarias. Este repositorio implementa el backend con NestJS, TypeScript y SQL Server. El criterio central es la consistencia del saldo cuando dos transferencias compiten por la misma cuenta.

---

## Descripción de la solución

El banco necesita registrar cuentas, mover dinero entre ellas y procesar lotes de transferencias sin dejar un saldo inconsistente o negativo.

La API permite:

- Crear cuentas y consultarlas por id o por número.
- Consultar el balance y el estado de la cuenta.
- Listar movimientos con filtros de fecha, tipo y monto, paginados en SQL Server.
- Ejecutar una transferencia atómica entre dos cuentas.
- Cargar un CSV de hasta 10,000 transferencias, procesarlo en segundo plano y consultar el progreso, los éxitos y los fallos.
- Generar el estado de cuenta mensual en JSON y en PDF.
- Autenticar con JWT y autorizar por los roles `ADMIN` y `USER`.

El caso que define la evaluación es este: una cuenta tiene RD$10,000 y recibe al mismo tiempo una transferencia de RD$8,000 y otra de RD$7,000. Solo una puede aprobarse. El saldo queda en RD$2,000 o en RD$3,000. No hay saldo negativo ni un débito sin su crédito.

El cliente web no vive en este repositorio. La API acepta llamadas desde `http://localhost:3000`.

---

## Arquitectura

```text
Cliente (Swagger o web en el puerto 3000)
        │
        ▼
API NestJS  ── el proceso del lote vive aquí
        │
        ▼
SQL Server
  cuentas, transferencias, movimientos, lotes
  dbo.usp_execute_transfer
```

Cada transferencia individual entra a SQL Server con una sola llamada al procedimiento `dbo.usp_execute_transfer`. Ese procedimiento abre la transacción, bloquea las cuentas, actualiza los dos saldos e inserta la transferencia y los dos movimientos. Hace `COMMIT` solo si todo eso termina bien. Si algo falla, hace `ROLLBACK`.

El lote no usa Redis, BullMQ ni un worker aparte. `POST /api/batch-transfers` valida el CSV, guarda el proceso y responde con el id. El procesamiento sigue dentro del mismo proceso Nest, fila por fila, reutilizando el mismo procedimiento. Una fila fallida no revierte las filas que ya hicieron `COMMIT`.

---

## Tecnologías utilizadas

### Backend

- Node.js 20+
- NestJS
- TypeScript
- TypeORM
- SQL Server 2022
- `decimal.js`
- JWT / Passport
- bcrypt
- class-validator / class-transformer
- Swagger / OpenAPI
- PDFKit
- csv-parse
- Vitest

### Infraestructura

- Docker y Docker Compose, para ejecutar SQL Server en desarrollo

El dinero se guarda como `decimal(19,4)`. Los cálculos de la aplicación usan `decimal.js`, no el tipo `number` de JavaScript.

---

## Requisitos

- Node.js 20 o superior
- npm
- Docker Desktop

Puertos de este entorno:


| Servicio                         | Puerto                             |
| -------------------------------- | ---------------------------------- |
| SQL Server dentro del contenedor | `1433`                             |
| SQL Server publicado en el host  | `14333` (`DB_PORT`)                |
| API                              | `3001` (`PORT` del `.env.example`) |
| Cliente permitido por CORS       | `3000`                             |


El mapeo `14333:1433` evita chocar con un SQL Server local de Windows que ya use el `1433`. Si `PORT` no está definido, la API escucha en `3000`. El script del caso concurrente llama a `http://localhost:3001/api`, así que el `.env` de desarrollo debe dejar la API en `3001`.

---

## Instalación y configuración

1. Clonar el repositorio e instalar dependencias.

```bash
npm install
```

1. Crear el archivo de entorno.

```bash
cp .env.example .env
```

En Windows se puede copiar `.env.example` como `.env`. `MSSQL_SA_PASSWORD` y `DB_PASSWORD` deben ser la misma contraseña. SQL Server exige mayúsculas, minúsculas, números y símbolos.

1. Levantar SQL Server y esperar a que el healthcheck quede `healthy`.

```bash
docker compose up -d
docker compose ps
```

1. Crear la base `banking` la primera vez.

```powershell
docker exec -it banking-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "ChangeMe_StrongPass1" -C -Q "IF DB_ID('banking') IS NULL CREATE DATABASE banking;"
```

Sustituir `ChangeMe_StrongPass1` por la contraseña local.

1. Aplicar el esquema y los datos iniciales.

```bash
npm run migration:run
npm run seed:roles
npm run seed:admin
npm run seed:demo
```

1. Arrancar la API.

```bash
npm run start:dev
```

1. Abrir Swagger en [http://localhost:3001/api/docs](http://localhost:3001/api/docs).

Para detener SQL Server sin borrar datos: `docker compose stop`. `docker compose down` elimina el contenedor y conserva el volumen.

---

## Variables de entorno

Valores de desarrollo de `.env.example`:


| Variable                      | Ejemplo                             | Uso                                                                       |
| ----------------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| `MSSQL_SA_PASSWORD`           | `ChangeMe_StrongPass1`              | Contraseña `sa` del contenedor. Debe coincidir con `DB_PASSWORD`.         |
| `DB_HOST`                     | `localhost`                         | Host de SQL Server.                                                       |
| `DB_PORT`                     | `14333`                             | Puerto publicado en el host. Dentro del contenedor SQL escucha en `1433`. |
| `DB_USER`                     | `sa`                                | Usuario de la base.                                                       |
| `DB_PASSWORD`                 | `ChangeMe_StrongPass1`              | Contraseña de la API y de los scripts.                                    |
| `DB_NAME`                     | `banking`                           | Base de datos.                                                            |
| `DB_ENCRYPT`                  | `true`                              | Cifrado de la conexión.                                                   |
| `DB_TRUST_SERVER_CERTIFICATE` | `true`                              | Acepta el certificado del SQL Server local.                               |
| `ADMIN_NAME`                  | `Administrator`                     | Nombre del administrador inicial (`seed:admin`).                          |
| `ADMIN_EMAIL`                 | `admin@banking.local`               | Correo del administrador inicial y del script de concurrencia.            |
| `ADMIN_PASSWORD`              | `Admin123!`                         | Contraseña de desarrollo. Se guarda con bcrypt.                           |
| `PORT`                        | `3001`                              | Puerto HTTP de la API.                                                    |
| `JWT_SECRET`                  | `change-me-to-a-long-random-secret` | Firma del JWT. Cambiarlo fuera de desarrollo.                             |
| `JWT_EXPIRES_IN`              | `2h`                                | Vida del token.                                                           |


No hay `.env` de un frontend en este repositorio.

---

## Ejecución

Desarrollo:

```bash
npm run start:dev
```

Compilar y ejecutar la build:

```bash
npm run build
npm run start:prod
```

Con la API en marcha:

- Swagger: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- Prefijo de los recursos: `/api`

En Swagger, el botón **Authorize** recibe el JWT. El login es `POST /api/auth/login`. El registro público crea usuarios `USER`. El primer `ADMIN` sale de `npm run seed:admin`. Un administrador autenticado puede cambiar el rol de otros usuarios, y la API no permite quitar el rol al último administrador.

Los endpoints de cuentas, transferencias y lotes exigen `Authorization: Bearer`. La carga del CSV (`POST /api/batch-transfers`) exige además el rol `ADMIN`.

---

## Migraciones y seed de datos

TypeORM no sincroniza el esquema (`synchronize: false`). El esquema y el procedimiento `dbo.usp_execute_transfer` se aplican con migraciones:

```bash
npm run migration:run
```

Otros comandos: `npm run migration:show`, `npm run migration:revert`.

### Datos demo

```bash
npm run seed:demo
```


| Número de cuenta | Titular             | Balance        |
| ---------------- | ------------------- | -------------- |
| `1000000011`     | Cuenta Demo Origen  | RD$10,000.0000 |
| `1000000012`     | Cuenta Demo Destino | RD$5,000.0000  |


Si esas cuentas ya existen, el script restablece titular, moneda, estado y saldo. No borra transferencias ni movimientos previos. Las cuentas creadas por la API nacen con saldo `0`.

Antes del demo hacen falta los roles y el administrador:

```bash
npm run seed:roles
npm run seed:admin
```

`seed:roles` crea `ADMIN` y `USER`. `seed:admin` crea el usuario de `ADMIN_EMAIL` con la contraseña hasheada.

### Volumen

```bash
npm run seed:volume
```

Genera al menos 200,000 movimientos, en tandas, junto con cuentas de carga `LOAD000001` en adelante. Sirve para probar filtros, paginación e índices. No modifica las cuentas demo `1000000011` y `1000000012`.

---

## Ejecución de pruebas

### Caso obligatorio de concurrencia

La API debe estar corriendo en el puerto `3001`, con migraciones, roles y administrador aplicados.

```bash
npm run test:concurrency:example
```

El script inicia sesión con `ADMIN_EMAIL` y crea sus propias cuentas, distintas de las del seed demo: una origen con RD$10,000 y una destino con RD$5,000. El número de cuenta lleva la marca de tiempo de esa corrida. Luego envía al mismo tiempo:

- transferencia A de RD$8,000
- transferencia B de RD$7,000

Resultado correcto: exactamente una transferencia aprobada.

- Si entra la de RD$8,000, el saldo queda en RD$2,000.
- Si entra la de RD$7,000, el saldo queda en RD$3,000.

La otra se rechaza por saldo insuficiente. El script termina en éxito cuando no hay saldo negativo, doble aprobación ni movimientos a medias. Ese es el criterio de aceptación de la prueba.

### Tests unitarios

```bash
npm run test
```

Vitest cubre reglas de la API, incluida la transferencia. El caso de dinero concurrente no se simula en memoria: se demuestra con el script anterior contra SQL Server.

---

## Cómo ejecutar el procesamiento masivo

El CSV usa encabezado y una transferencia por fila:

```csv
sourceAccountNumber,destinationAccountNumber,amount
1000000011,1000000012,1.00
```

Reglas del archivo:

- Extensión `.csv`.
- Máximo 10,000 filas de datos.
- Monto mayor que 0, con hasta 4 decimales.
- La cuenta origen y la destino de una fila no pueden ser iguales.
- Si el archivo viene vacío o una fila no cumple el formato, la API rechaza la carga y no crea el proceso.

Generar un archivo de 10,000 filas:

```bash
npm run generate:performance:wide
```

Ese comando escribe `batch-performance-multiple-accounts.csv`, repartido entre las cuentas `LOAD000001` a `LOAD000050`, con monto `1.00`. `npm run generate:batch` escribe `batch-10000.csv` con un solo par de cuentas. Esas cuentas deben existir y tener saldo; `npm run seed:volume` las crea.

El archivo se sube desde el frontend, con un usuario `ADMIN`. También se puede cargar en Swagger, en `POST /api/batch-transfers`: primero **Authorize** con el JWT y después el campo `file`.

La respuesta incluye el id del proceso y regresa sin esperar a las 10,000 filas. El progreso se ve en el frontend o, en Swagger, con:

- `GET /api/batch-transfers/:id` — estado, total, procesadas, exitosas y fallidas.
- `GET /api/batch-transfers/:id/items` — resultado de cada fila, con código y mensaje cuando falló.

Cada fila es una transferencia propia. Si una fila no tiene saldo o la cuenta no existe, queda `FAILED` y el lote sigue. El proceso termina en `COMPLETED` cuando todas salen bien y en `COMPLETED_WITH_ERRORS` cuando alguna falló. Un error inesperado del proceso marca el lote como `FAILED`.

La clave de idempotencia de cada fila es `{idDelLote}:{numeroDeFila}`. Repetir el procesamiento de esa fila no vuelve a mover el dinero.

---

## Decisiones técnicas importantes

### ¿Por qué bloqueo pesimista?

El caso obligatorio son dos débitos que no caben juntos en RD$10,000. Con bloqueo optimista las dos transacciones pueden leer RD$10,000, decidir que el saldo alcanza y escribir después. Hace falta un control extra de versión para que la segunda pierda, y un olvido de ese control deja el saldo negativo o perdido.

El bloqueo pesimista toma la decisión con las filas ya reservadas. La segunda transferencia espera, lee el saldo que dejó la primera y, si ya no alcanza, termina en `INSUFFICIENT_BALANCE` sin modificar nada.

### Locks y orden

Dentro de `dbo.usp_execute_transfer`, las dos cuentas se leen así:

```sql
SELECT id, balance, status
FROM accounts WITH (UPDLOCK, ROWLOCK, HOLDLOCK)
WHERE id IN (@source_account_id, @destination_account_id)
ORDER BY id;
```

- `UPDLOCK` pide el lock de actualización en la lectura. La otra transacción no puede leer ese saldo como si todavía estuviera disponible para debitarlo.
- `HOLDLOCK` mantiene el lock hasta el `COMMIT` o el `ROLLBACK`, que es el intervalo en el que el saldo leído sigue siendo el saldo sobre el que se decide.
- `ROWLOCK` pide granularidad de fila.

`ORDER BY id` hace que las transferencias intenten tomar las cuentas en un orden determinista, reduciendo el riesgo de deadlocks entre transferencias que involucran las mismas cuentas.

Esos locks viven en la transacción del procedimiento, no en una transacción abierta desde Nest. La API solo ejecuta el procedimiento y lee el resultado.

### Aislamiento

La sesión queda en `READ COMMITTED`, el aislamiento por defecto de SQL Server. No se subió toda la base a `SERIALIZABLE`.

`SERIALIZABLE` global añadiría range locks a consultas que no mueven dinero, como el listado de movimientos o el progreso del lote, y aumentaría los deadlocks. La protección del saldo ya está en las dos filas de cuenta: `UPDLOCK` y `HOLDLOCK` las retienen hasta el fin de esa transferencia. El resto de la API no necesita ese aislamiento.

### Deadlock 1205

El orden de las cuentas reduce los deadlocks; no los elimina. Si SQL Server devuelve el error `1205`, la API vuelve a ejecutar el procedimiento completo. No reutiliza saldos leídos antes del fallo.

Hay tres reintentos, con esperas de 50 ms, 100 ms y 200 ms. Si los tres fallan, la transferencia responde `DEADLOCK_RETRY_EXHAUSTED`. En un lote, esa fila queda registrada como fallida y el proceso continúa con la siguiente.

### Resultado del caso RD$10,000 / RD$8,000 / RD$7,000

`npm run test:concurrency:example` dispara las dos transferencias a la vez contra una cuenta de RD$10,000.

La que obtiene el lock primero descuenta su monto y confirma. La otra entra después, ve el saldo restante y no alcanza:

- RD$10,000 − RD$8,000 = RD$2,000, y la de RD$7,000 se rechaza; o
- RD$10,000 − RD$7,000 = RD$3,000, y la de RD$8,000 se rechaza.

Nunca se aprueban las dos, porque 8,000 + 7,000 = 15,000. El `ROLLBACK` de la rechazada no toca el saldo ni deja un movimiento suelto. El script lo considera correcto solo si el saldo final es uno de esos dos valores y hay una sola transferencia aprobada.

### Idempotencia

`transfers.idempotency_key` es única. El procedimiento busca esa clave al abrir la transacción, antes de bloquear cuentas y antes de mirar el saldo.

- La misma clave, con el mismo origen, destino y monto, devuelve la transferencia original. No crea otra fila ni otros movimientos, aunque el saldo actual ya no alcance. Por eso repetir la de RD$8,000 cuando el saldo quedó en RD$2,000 sigue devolviendo la transferencia ya aplicada.
- La misma clave con otro cuerpo devuelve `IDEMPOTENCY_KEY_CONFLICT`.
- Si dos llamadas nuevas con la misma clave se cruzan, el índice único produce `2601` o `2627`. El procedimiento lee la fila ganadora y responde como replay o como conflicto. No inserta un segundo movimiento.

En el lote, la clave `{idDelLote}:{numeroDeFila}` hace que un reintento de esa fila no duplique el débito.

### Movimientos, paginación e índices

El listado no carga el historial en memoria. Filtra en SQL Server por cuenta, fechas, tipo y rango de monto, ordena por `created_at` e `id`, y aplica `OFFSET`/`FETCH` con `skip` y `take`.

Los índices que sostienen esa consulta son:

- `IX_account_movements_account_created` sobre `(account_id, created_at)`
- `IX_account_movements_account_type_created` sobre `(account_id, type, created_at)`

Con el volumen de `npm run seed:volume` (200,000 movimientos o más), el plan de ejecución de SQL Server debe mostrar un seek por cuenta y fecha, no un scan de toda la tabla seguido de un filtro en la aplicación. El estado de cuenta usa el mismo criterio: el mes es el intervalo `[inicio del mes, inicio del mes siguiente)` y la página también sale de SQL Server.

### Otras decisiones que sostienen lo anterior

- El monto es `decimal(19,4)` en la base y `decimal.js` en Node. Un `number` de JavaScript no representa centavos de forma exacta.
- El lote corre en el proceso Nest. Cada fila conserva su propia transacción y el `POST` responde en cuanto el trabajo quedó registrado.
- La consistencia manda sobre el throughput (Transferencias procesadas por segundo). Un CSV donde miles de filas comparten pocas cuentas espera más en los locks que un CSV repartido entre muchas cuentas.

### Valor agregado ya incluido

JWT, roles `ADMIN` y `USER`, y SQL Server en Docker Compose forman parte de esta entrega. No hay imagen Docker de la API ni rate limit de login. Las pruebas automáticas son las de Vitest; la prueba de aceptación del dinero concurrente es `npm run test:concurrency:example`.

---

## Modelo de datos


| Tabla                  | Rol                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `accounts`             | Número, titular, moneda `DOP`, saldo `decimal(19,4) >= 0`, estado.                   |
| `transfers`            | Origen, destino, monto, estado, referencia única, clave de idempotencia única.       |
| `account_movements`    | Débito o crédito, saldo anterior, saldo posterior y la transferencia que lo originó. |
| `batch_processes`      | Archivo, estado, totales y progreso del lote.                                        |
| `batch_transfer_items` | Una fila del CSV, sus intentos y el error si falló.                                  |
| `roles` / `users`      | `ADMIN` y `USER`. La contraseña se guarda con bcrypt.                                |


## Scripts


| Comando                            | Para qué                                                   |
| ---------------------------------- | ---------------------------------------------------------- |
| `npm run start:dev`                | API en desarrollo                                          |
| `npm run migration:run`            | Aplica el esquema y el procedimiento                       |
| `npm run seed:roles`               | Crea `ADMIN` y `USER`                                      |
| `npm run seed:admin`               | Crea el administrador del `.env`                           |
| `npm run seed:demo`                | Cuentas `1000000011` (RD$10,000) y `1000000012` (RD$5,000) |
| `npm run seed:volume`              | Al menos 200,000 movimientos                               |
| `npm run test:concurrency:example` | Caso RD$10,000 / RD$8,000 / RD$7,000                       |
| `npm run test`                     | Tests unitarios                                            |
| `npm run generate:performance:wide` | CSV de 10,000 filas entre `LOAD000001` y `LOAD000050`     |
| `npm run generate:batch`           | CSV de 10,000 filas sobre un solo par de cuentas           |


## Repositorio

```text
src/
  accounts/
  transfers/
  batch-transfers/
  auth/
  users/
  database/
    entities/
    migrations/
scripts/
  seed-demo.ts
  seed-volume.ts
  seed-roles.ts
  seed-admin.ts
  test-concurrency-example.ts
  generate-performance-csv.ts
```

## Licencia

`UNLICENSED`. Proyecto privado de la evaluación técnica.