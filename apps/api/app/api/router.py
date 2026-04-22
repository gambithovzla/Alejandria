from fastapi import APIRouter

from app.api.routes import approvals, health, memories, projects, scenes

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(scenes.router, prefix="/scenes", tags=["scenes"])
api_router.include_router(memories.router, tags=["memories"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["approvals"])
