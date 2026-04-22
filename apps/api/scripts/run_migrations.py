from __future__ import annotations

import os
from pathlib import Path

from alembic.config import main as alembic_main


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    os.chdir(project_root)
    alembic_main(argv=["-c", "alembic.ini", "upgrade", "head"], prog="alembic")


if __name__ == "__main__":
    main()
