import sys
from pathlib import Path
import uvicorn

# Ensure server folder is on Python path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import settings

if __name__ == "__main__":
    print(f"Starting Linear Audit PMS Python Data API on http://{settings.HOST}:{settings.PORT}")
    print(f"API Docs available at http://localhost:{settings.PORT}/api/docs")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
