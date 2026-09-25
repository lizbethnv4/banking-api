# Banking API

API NestJS para cuentas, transferencias atómicas, movimientos y procesamiento por lote. Base de datos: **SQL Server** (Docker en desarrollo).

## Requisitos

- Node.js 20+
- Docker Desktop (SQL Server local)

## Configuración inicial

```bash
npm install
cp .env.example .env
```

Edita `.env` y usa la misma contraseña en `MSSQL_SA_PASSWORD` y `DB_PASSWORD` (mínimo 8 caracteres, mayúsculas, minúsculas, números y símbolos según política de SQL Server).

Por defecto la API se conecta al puerto **14333** en el host (mapeo al 1433 del contenedor). Así se evita choque con una instancia local de SQL Server en Windows que suele usar el **1433**.

## SQL Server (Docker)

Levantar el contenedor:

```bash
docker compose up -d
```

Comprobar estado:

```bash
docker compose ps
docker compose logs -f sqlserver
```

Detener sin borrar datos:

```bash
docker compose stop
```

Bajar contenedor y red (el volumen persiste):

```bash
docker compose down
```

Espera a que el healthcheck esté **healthy** antes de conectar o migrar.

### Crear la base de datos `banking`

Solo la primera vez (si aún no existe):

```bash
docker exec -it banking-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "%DB_PASSWORD%" -C -Q "IF DB_ID('banking') IS NULL CREATE DATABASE banking;"
```

En PowerShell, sustituye `%DB_PASSWORD%` por el valor de tu `.env` o:

```powershell
docker exec -it banking-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "ChangeMe_StrongPass1" -C -Q "IF DB_ID('banking') IS NULL CREATE DATABASE banking;"
```

## Migraciones (TypeORM)

Las migraciones se ejecutan con **tsx** y el CLI de TypeORM contra `src/database/data-source.ts` (`synchronize: false`).

| Comando | Descripción |
|--------|-------------|
| `npm run migration:show` | Lista migraciones pendientes / aplicadas |
| `npm run migration:run` | Aplica migraciones pendientes |
| `npm run migration:revert` | Revierte la última migración |
| `npm run migration:generate -- src/database/migrations/NombreCambio` | Genera migración desde diff de entidades (requiere nombre de archivo) |
  `npm run typeorm -- migration:create src/database/migrations/NombreCambio` | Genera archivo para migración vacío

Ejemplo tras levantar Docker y crear la BD:

```bash
npm run migration:run
```

## API (NestJS)

```bash
# desarrollo con recarga
npm run start:dev

# compilación
npm run build
npm run start:prod
```

Por defecto escucha en `PORT` (3000).

## Tests

```bash
npm run test
npm run test:e2e
npm run test:cov
```

## Estructura de datos (resumen)

- **accounts** — saldo, moneda, titular, versión optimista
- **transfers** — referencia única, idempotencia, estados
- **account_movements** — historial con saldos antes/después
- **batch_processes** / **batch_transfer_items** — lotes CSV

Entidades en `src/database/entities/`; esquema inicial en `src/database/migrations/1695312000000-CreateInitialSchema.ts`.

## Licencia

UNLICENSED (proyecto privado).
