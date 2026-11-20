from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings

from app.routers import (
    clients,
    services,
    projects,
    tasks,
    workflows,
    finance,
    employees,
    documents,
    vault,
    settings as settings_router,
    system,
)

app = FastAPI(
    title="Linear Audit PMS Data API",
    description="Enterprise server-side Python Data API proxying Supabase PostgreSQL with JWKS authentication.",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(clients.router)
app.include_router(services.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(workflows.router)
app.include_router(finance.router)
app.include_router(employees.router)
app.include_router(documents.router)
app.include_router(vault.router)
app.include_router(settings_router.router)
app.include_router(system.router)

@app.get("/")
async def root():
    return {
        "message": "Linear Audit PMS Python Data API is online.",
        "documentation": "/api/docs",
        "health": "/api/system/health",
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "path": request.url.path},
    )
