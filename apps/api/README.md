# NovelEngine API

Backend FastAPI del MVP de NovelEngine.

## Railway

Para Railway, este servicio puede desplegarse usando el `Dockerfile` incluido en esta carpeta.

- Root Directory: `apps/api`
- Build Command: dejar vacio para que Railway use el `Dockerfile`
- Pre-Deploy Command: `python scripts/run_migrations.py`
- Start Command: dejar vacio para usar el `CMD` del `Dockerfile`

## Comandos utiles

```bash
pip install -e .[dev]
alembic upgrade head
pytest
uvicorn app.main:app --reload
```
