# FixedIncome - Docker Development

## Services

- `frontend`: React + Vite dev server on `http://localhost:5173`
- `backend`: Django dev server on `http://localhost:8000`
- `db`: PostgreSQL 16 on `localhost:5432`

## Start

```bash
docker compose up --build
```

Run from the `FixedIncome` directory.

## Common commands

Apply migrations:

```bash
docker compose exec backend python manage.py migrate
```

Create migrations:

```bash
docker compose exec backend python manage.py makemigrations
```

Create superuser:

```bash
docker compose exec backend python manage.py createsuperuser
```

Run backend tests:

```bash
docker compose exec backend python manage.py test
```

Install a new frontend package:

```bash
docker compose exec frontend npm install <package-name>
```

## Stop and cleanup

Stop services:

```bash
docker compose down
```

Stop and remove volumes (including DB data):

```bash
docker compose down -v
```

## Troubleshooting

- If backend cannot connect to DB, check `db` health and logs:
  - `docker compose ps`
  - `docker compose logs db backend`
- If frontend dependencies seem broken, rebuild frontend image:
  - `docker compose build frontend --no-cache`
- If Django behavior looks stale, restart backend:
  - `docker compose restart backend`
- If DB schema/data is inconsistent during dev experiments, reset volumes:
  - `docker compose down -v && docker compose up --build`
