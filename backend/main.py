import os
import uuid
import shutil
import datetime
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List

import database
from database import init_db, get_db, TranslationMemory, Glossary, TranslationJob
from services.excel_service import ExcelService

# Request payloads for modifying and bulk deleting entries
class MemoryUpdate(BaseModel):
    source_text: str
    translated_text: str

class GlossaryUpdate(BaseModel):
    source_term: str
    target_term: str

class BulkDeleteRequest(BaseModel):
    ids: List[int]

# Create folders for staging files
UPLOAD_DIR = "./temp_uploads"
EXPORT_DIR = "./temp_exports"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)

# Initialize FastAPI app
app = FastAPI(title="LocFlow Backend", description="AI game translation workflow helper")

# Configure CORS for local frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production; okay for local utility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database schema on startup
@app.on_event("startup")
def startup_event():
    init_db()

excel_service = ExcelService()

# --- 1. Dashboard Stats Endpoint ---

@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Aggregated stats for the dashboard display."""
    total_jobs = db.query(TranslationJob).count()
    
    # Aggregates from translation jobs
    job_sums = db.query(
        func.sum(TranslationJob.total_rows).label("total"),
        func.sum(TranslationJob.tm_hits).label("tm_hits"),
        func.sum(TranslationJob.ai_translations).label("ai_trans")
    ).filter(TranslationJob.status == "COMPLETED").first()
    
    total_processed = int(job_sums.total or 0)
    total_tm_hits = int(job_sums.tm_hits or 0)
    total_ai_trans = int(job_sums.ai_trans or 0)
    
    # Estimated time saved (assuming 15 seconds per manual row translation)
    seconds_saved = total_processed * 15
    hours_saved = round(seconds_saved / 3600.0, 1)

    glossary_count = db.query(Glossary).count()
    tm_count = db.query(TranslationMemory).count()
    
    # Recent jobs (last 5)
    recent_jobs = db.query(TranslationJob).order_by(
        TranslationJob.created_at.desc()
    ).limit(5).all()

    return {
        "total_processed": total_processed,
        "total_tm_hits": total_tm_hits,
        "total_ai_trans": total_ai_trans,
        "hours_saved": hours_saved,
        "glossary_count": glossary_count,
        "tm_count": tm_count,
        "recent_jobs": [
            {
                "id": job.id,
                "filename": job.filename,
                "total_rows": job.total_rows,
                "processed_rows": job.processed_rows,
                "status": job.status,
                "created_at": job.created_at.isoformat() if job.created_at else None
            }
            for job in recent_jobs
        ]
    }


# --- 2. Translation Memory (TM) Management ---

@app.post("/api/memory/import")
async def import_memory(file: UploadFile = File(...)):
    """Uploads and imports a Chinese-Vietnamese Excel dictionary into Translation Memory."""
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only Excel (.xlsx) files are supported.")
    
    temp_filepath = os.path.join(UPLOAD_DIR, f"temp_dict_{uuid.uuid4()}.xlsx")
    try:
        with open(temp_filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        imported = excel_service.import_dictionary_file(temp_filepath)
        return {"message": "Success", "imported_count": imported}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
    finally:
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)


@app.get("/api/memory")
def get_memory(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """Lists translation memory entries with paginated search and sorting."""
    query = db.query(TranslationMemory)
    if search:
        query = query.filter(
            (TranslationMemory.source_text.like(f"%{search}%")) |
            (TranslationMemory.translated_text.like(f"%{search}%"))
        )
    
    total = query.count()
    offset = (page - 1) * limit
    
    order_clause = TranslationMemory.created_at.desc() if sort_order == "desc" else TranslationMemory.created_at.asc()
    items = query.order_by(order_clause).offset(offset).limit(limit).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit
    }


@app.put("/api/memory/{entry_id}")
def update_memory_entry(entry_id: int, payload: MemoryUpdate, db: Session = Depends(get_db)):
    """Modifies a specific translation memory entry, verifying cross-table uniqueness."""
    entry = db.query(TranslationMemory).filter(TranslationMemory.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    src_cleaned = payload.source_text.strip()
    tgt_cleaned = payload.translated_text.strip()
    
    if not src_cleaned or not tgt_cleaned:
        raise HTTPException(status_code=400, detail="Fields cannot be empty")
        
    # Check for duplicates if the source text has changed
    if src_cleaned != entry.source_text:
        exists_in_tm = db.query(TranslationMemory).filter(TranslationMemory.source_text == src_cleaned).first()
        exists_in_glossary = db.query(Glossary).filter(Glossary.source_term == src_cleaned).first()
        if exists_in_tm or exists_in_glossary:
            raise HTTPException(status_code=400, detail="This Chinese text already exists in either Glossary or Memory.")
            
    entry.source_text = src_cleaned
    entry.translated_text = tgt_cleaned
    db.commit()
    return {"message": "Updated successfully"}


@app.delete("/api/memory/{entry_id}")
def delete_memory_entry(entry_id: int, db: Session = Depends(get_db)):
    """Deletes a specific translation memory entry."""
    entry = db.query(TranslationMemory).filter(TranslationMemory.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    db.delete(entry)
    db.commit()
    return {"message": "Deleted successfully"}


@app.post("/api/memory/bulk-delete")
def bulk_delete_memory(payload: BulkDeleteRequest, db: Session = Depends(get_db)):
    """Bulk deletes selected translation memory entries."""
    if not payload.ids:
        return {"message": "No IDs provided"}
    db.query(TranslationMemory).filter(TranslationMemory.id.in_(payload.ids)).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Successfully deleted {len(payload.ids)} entries"}


@app.delete("/api/memory")
def clear_all_memory(db: Session = Depends(get_db)):
    """Deletes all translation memory entries."""
    db.query(TranslationMemory).delete()
    db.commit()
    return {"message": "All translation memory entries have been successfully deleted"}


@app.get("/api/memory/export")
def export_memory(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Exports all translation memory entries to an Excel file and returns it as a download."""
    export_filename = "translation_memory_export.xlsx"
    filepath = os.path.join(EXPORT_DIR, f"tm_export_{uuid.uuid4()}.xlsx")
    try:
        excel_service.export_memory_file(filepath)
        # Schedule cleanup task
        background_tasks.add_task(os.remove, filepath)
        return FileResponse(
            path=filepath,
            filename=export_filename,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")



# --- 3. Glossary Management ---

@app.post("/api/glossary/import")
async def import_glossary(file: UploadFile = File(...)):
    """Uploads and imports a Chinese-Vietnamese Glossary Excel file."""
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only Excel (.xlsx) files are supported.")
    
    temp_filepath = os.path.join(UPLOAD_DIR, f"temp_glossary_{uuid.uuid4()}.xlsx")
    try:
        with open(temp_filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        imported = excel_service.import_glossary_file(temp_filepath)
        return {"message": "Success", "imported_count": imported}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
    finally:
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)


@app.get("/api/glossary")
def get_glossary(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """Lists glossary terms with pagination, search, and sorting."""
    query = db.query(Glossary)
    if search:
        query = query.filter(
            (Glossary.source_term.like(f"%{search}%")) |
            (Glossary.target_term.like(f"%{search}%"))
        )
        
    total = query.count()
    offset = (page - 1) * limit
    
    order_clause = Glossary.created_at.desc() if sort_order == "desc" else Glossary.created_at.asc()
    items = query.order_by(order_clause).offset(offset).limit(limit).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit
    }


@app.put("/api/glossary/{term_id}")
def update_glossary_term(term_id: int, payload: GlossaryUpdate, db: Session = Depends(get_db)):
    """Modifies a specific glossary term, verifying cross-table uniqueness."""
    term = db.query(Glossary).filter(Glossary.id == term_id).first()
    if not term:
        raise HTTPException(status_code=404, detail="Glossary term not found")
        
    src_cleaned = payload.source_term.strip()
    tgt_cleaned = payload.target_term.strip()
    
    if not src_cleaned or not tgt_cleaned:
        raise HTTPException(status_code=400, detail="Fields cannot be empty")
        
    # Check for duplicates if the source term has changed
    if src_cleaned != term.source_term:
        exists_in_tm = db.query(TranslationMemory).filter(TranslationMemory.source_text == src_cleaned).first()
        exists_in_glossary = db.query(Glossary).filter(Glossary.source_term == src_cleaned).first()
        if exists_in_tm or exists_in_glossary:
            raise HTTPException(status_code=400, detail="This terminology already exists in either Glossary or Memory.")
            
    term.source_term = src_cleaned
    term.target_term = tgt_cleaned
    db.commit()
    return {"message": "Updated successfully"}


@app.delete("/api/glossary/{term_id}")
def delete_glossary_term(term_id: int, db: Session = Depends(get_db)):
    """Deletes a specific glossary term."""
    term = db.query(Glossary).filter(Glossary.id == term_id).first()
    if not term:
        raise HTTPException(status_code=404, detail="Glossary term not found")
    
    db.delete(term)
    db.commit()
    return {"message": "Deleted successfully"}


@app.post("/api/glossary/bulk-delete")
def bulk_delete_glossary(payload: BulkDeleteRequest, db: Session = Depends(get_db)):
    """Bulk deletes selected glossary terms."""
    if not payload.ids:
        return {"message": "No IDs provided"}
    db.query(Glossary).filter(Glossary.id.in_(payload.ids)).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Successfully deleted {len(payload.ids)} terms"}


@app.delete("/api/glossary")
def clear_all_glossary(db: Session = Depends(get_db)):
    """Deletes all glossary terms."""
    db.query(Glossary).delete()
    db.commit()
    return {"message": "All glossary terms have been successfully deleted"}


@app.get("/api/glossary/export")
def export_glossary(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Exports all glossary terms to an Excel file and returns it as a download."""
    export_filename = "glossary_export.xlsx"
    filepath = os.path.join(EXPORT_DIR, f"glossary_export_{uuid.uuid4()}.xlsx")
    try:
        excel_service.export_glossary_file(filepath)
        # Schedule cleanup task
        background_tasks.add_task(os.remove, filepath)
        return FileResponse(
            path=filepath,
            filename=export_filename,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")



# --- 4. File Translation (Target File) ---

@app.post("/api/translate/upload")
async def start_translation_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    save_to_tm: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Uploads a game Excel file and schedules the translation process in the background."""
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only Excel (.xlsx) files are supported.")
    
    job_id = str(uuid.uuid4())
    input_filepath = os.path.join(UPLOAD_DIR, f"{job_id}_input.xlsx")
    output_filepath = os.path.join(EXPORT_DIR, f"{job_id}_output.xlsx")
    
    # Save uploaded file
    with open(input_filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create database entry
    job = TranslationJob(
        id=job_id,
        filename=file.filename,
        status="PENDING",
        created_at=datetime.datetime.utcnow()
    )
    db.add(job)
    db.commit()
    
    # Start thread task in background
    background_tasks.add_task(
        excel_service.process_translation_job,
        job_id,
        input_filepath,
        output_filepath,
        save_to_tm
    )
    
    return {
        "job_id": job_id,
        "filename": file.filename,
        "status": "PENDING"
    }


@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Queries current stats and progress coordinates of a translation job."""
    job = db.query(TranslationJob).filter(TranslationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Calculate estimated remaining time (ETA)
    eta_seconds = 0
    if job.status == "PROCESSING" and job.processed_rows > 0:
        elapsed = (datetime.datetime.utcnow() - job.created_at).total_seconds()
        rows_remaining = job.total_rows - job.processed_rows
        # Average duration per row
        time_per_row = elapsed / job.processed_rows
        eta_seconds = round(rows_remaining * time_per_row)

    return {
        "id": job.id,
        "filename": job.filename,
        "total_rows": job.total_rows,
        "processed_rows": job.processed_rows,
        "tm_hits": job.tm_hits,
        "ai_translations": job.ai_translations,
        "status": job.status,
        "error_message": job.error_message,
        "eta_seconds": eta_seconds,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None
    }


@app.get("/api/jobs/{job_id}/download")
def download_job_result(job_id: str, db: Session = Depends(get_db)):
    """Downloads the completed translation Excel file."""
    job = db.query(TranslationJob).filter(TranslationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != "COMPLETED":
        raise HTTPException(status_code=400, detail=f"File is not ready. Status: {job.status}")
        
    output_filepath = os.path.join(EXPORT_DIR, f"{job_id}_output.xlsx")
    if not os.path.exists(output_filepath):
        raise HTTPException(status_code=404, detail="Translated file not found on disk")
        
    # Return formatted download response
    export_filename = f"translated_{job.filename}"
    return FileResponse(
        path=output_filepath,
        filename=export_filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

# Run direct execution helper
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
