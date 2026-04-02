from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.assess import router as assess_router
from api.routes.plan import router as plan_router
from api.routes.roadmap import router as roadmap_router

app = FastAPI(title="Pathwise API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assess_router, prefix="/api")
app.include_router(plan_router, prefix="/api")
app.include_router(roadmap_router, prefix="/api")


@app.get("/")
async def root():
    return {"status": "ok"}
