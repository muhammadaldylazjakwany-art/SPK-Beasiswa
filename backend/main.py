from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from pydantic import BaseModel
from typing import List
import pandas as pd
import io

from spk_engine import AHP, SAW

# ==========================================
# 1. KONFIGURASI DATABASE SQLITE
# ==========================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./dss_database.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# ==========================================
# 2. SKEMA TABEL DATABASE (ORM)
# ==========================================
class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    criteria = relationship("Criteria", cascade="all, delete-orphan")
    alternatives = relationship("Alternative", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", cascade="all, delete-orphan")

class Criteria(Base):
    __tablename__ = "criteria"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String)
    type = Column(String) # 'Benefit' atau 'Cost'
    weight = Column(Float, default=0.0)

class Alternative(Base):
    __tablename__ = "alternatives"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String)

class Evaluation(Base):
    __tablename__ = "evaluations"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    alt_name = Column(String)
    crit_name = Column(String)
    value = Column(Float)

Base.metadata.create_all(bind=engine)

# ==========================================
# 3. SETUP FASTAPI & CORS
# ==========================================
app = FastAPI(title="Clean DSS Hybrid API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def root(): return {"message": "DSS Backend API Active"}

# ==========================================
# 4. API PROJECT
# ==========================================
class ProjectCreate(BaseModel): name: str

@app.post("/api/projects")
def add_project(req: ProjectCreate, db: Session = Depends(get_db)):
    if db.query(Project).filter_by(name=req.name).first():
        raise HTTPException(400, "Nama project sudah ada.")
    new_proj = Project(name=req.name)
    db.add(new_proj); db.commit(); db.refresh(new_proj)
    return new_proj

@app.get("/api/projects")
def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    db.query(Project).filter(Project.id == project_id).delete()
    db.commit()
    return {"message": "Project beserta seluruh datanya berhasil dihapus"}

# ==========================================
# 5. API KRITERIA (CRUD & BOBOT)
# ==========================================
class CritCreate(BaseModel): project_id: int; name: str; type: str
class CritUpdate(BaseModel): type: str
class WeightSave(BaseModel): project_id: int; weights: dict

@app.post("/api/criteria")
def add_criteria(req: CritCreate, db: Session = Depends(get_db)):
    if db.query(Criteria).filter_by(project_id=req.project_id, name=req.name).first():
        raise HTTPException(400, "Kriteria sudah ada.")
    new_crit = Criteria(project_id=req.project_id, name=req.name, type=req.type)
    db.add(new_crit); db.commit(); db.refresh(new_crit)
    return new_crit

@app.get("/api/criteria/{project_id}")
def get_criteria(project_id: int, db: Session = Depends(get_db)):
    return db.query(Criteria).filter_by(project_id=project_id).all()

@app.put("/api/criteria/{crit_id}")
def update_criteria_type(crit_id: int, req: CritUpdate, db: Session = Depends(get_db)):
    crit = db.query(Criteria).filter(Criteria.id == crit_id).first()
    if not crit: raise HTTPException(404, "Kriteria tidak ditemukan")
    crit.type = req.type
    db.commit()
    return {"message": "Tipe diupdate"}

@app.delete("/api/criteria/{crit_id}")
def delete_criteria(crit_id: int, db: Session = Depends(get_db)):
    db.query(Criteria).filter(Criteria.id == crit_id).delete()
    db.commit()
    return {"message": "Kriteria dihapus"}

@app.post("/api/criteria/save-weights")
def save_weights(req: WeightSave, db: Session = Depends(get_db)):
    for crit_name, w in req.weights.items():
        db.query(Criteria).filter_by(project_id=req.project_id, name=crit_name).update({"weight": w})
    db.commit()
    return {"message": "Bobot disimpan!"}

# ==========================================
# 6. API ALTERNATIF
# ==========================================
class AltCreate(BaseModel): project_id: int; name: str

@app.post("/api/alternatives")
def add_alternative(req: AltCreate, db: Session = Depends(get_db)):
    if db.query(Alternative).filter_by(project_id=req.project_id, name=req.name).first():
        raise HTTPException(400, "Alternatif sudah ada.")
    new_alt = Alternative(project_id=req.project_id, name=req.name)
    db.add(new_alt); db.commit(); db.refresh(new_alt)
    return new_alt

@app.get("/api/alternatives/{project_id}")
def get_alternatives(project_id: int, db: Session = Depends(get_db)):
    return db.query(Alternative).filter_by(project_id=project_id).all()

@app.delete("/api/alternatives/{alt_id}")
def delete_alternative(alt_id: int, db: Session = Depends(get_db)):
    db.query(Alternative).filter(Alternative.id == alt_id).delete()
    db.commit()
    return {"message": "Alternatif dihapus"}

# ==========================================
# 7. API EVALUASI MATRIKS & UPLOAD ETL
# ==========================================
class SingleEval(BaseModel): project_id: int; alt_name: str; crit_name: str; value: float
class BatchData(BaseModel): project_id: int; data: List[dict]

@app.get("/api/evaluations/{project_id}")
def get_evaluations(project_id: int, db: Session = Depends(get_db)):
    return db.query(Evaluation).filter_by(project_id=project_id).all()

@app.post("/api/evaluations/single")
def save_single_eval(req: SingleEval, db: Session = Depends(get_db)):
    evaluation = db.query(Evaluation).filter_by(
        project_id=req.project_id, alt_name=req.alt_name, crit_name=req.crit_name
    ).first()
    if evaluation: evaluation.value = req.value
    else: db.add(Evaluation(project_id=req.project_id, alt_name=req.alt_name, crit_name=req.crit_name, value=req.value))
    db.commit()
    return {"message": "Nilai disimpan"}

@app.post("/api/upload-preview")
async def upload_preview(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8-sig')))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        df = df.fillna("") 
        return {"columns": df.columns.tolist(), "data": df.to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(400, f"Gagal membaca file: {str(e)}")

@app.post("/api/evaluations/batch")
def save_batch(req: BatchData, db: Session = Depends(get_db)):
    if not req.data: raise HTTPException(400, "Data kosong")
    df = pd.DataFrame(req.data)
    alt_col = df.columns[0]
    criteria_cols = df.columns[1:]

    existing_crits = [c.name for c in db.query(Criteria).filter_by(project_id=req.project_id).all()]
    for c in criteria_cols:
        if c not in existing_crits: db.add(Criteria(project_id=req.project_id, name=c, type="Benefit"))
    db.commit()

    for _, row in df.iterrows():
        alt_name = str(row[alt_col])
        if not db.query(Alternative).filter_by(project_id=req.project_id, name=alt_name).first():
            db.add(Alternative(project_id=req.project_id, name=alt_name))
            
        for crit in criteria_cols:
            try:
                val = float(row[crit])
                db.query(Evaluation).filter_by(project_id=req.project_id, alt_name=alt_name, crit_name=crit).delete()
                db.add(Evaluation(project_id=req.project_id, alt_name=alt_name, crit_name=crit, value=val))
            except ValueError: pass
    db.commit()
    return {"message": "Data batch disimpan!"}

# ==========================================
# 8. API AHP & SAW ENGINES
# ==========================================
class AHPRequest(BaseModel): criteria: List[str]; matrix: List[List[float]]

@app.post("/api/ahp/calculate")
def calc_ahp(req: AHPRequest):
    ahp = AHP(req.criteria)
    cols, norm, w, lmax, ci, cr = ahp.calculate_weights_and_consistency(req.matrix)
    return {"criteria": req.criteria, "weights": w, "cr": cr, "is_consistent": cr <= 0.1}

@app.get("/api/saw/calculate/{project_id}")
def calculate_saw_endpoint(project_id: int, norm_type: str = "linear", db: Session = Depends(get_db)):
    crits = db.query(Criteria).filter_by(project_id=project_id).all()
    if not crits: raise HTTPException(400, "Kriteria belum ada.")
    
    types_dict = {c.name: c.type for c in crits}
    weights_dict = {c.name: c.weight for c in crits}
    if sum(weights_dict.values()) == 0:
        raise HTTPException(400, "Bobot 0! Hitung AHP dulu.")

    evals = db.query(Evaluation).filter_by(project_id=project_id).all()
    if not evals: raise HTTPException(400, "Data evaluasi kosong.")

    data_dict = {}
    for e in evals:
        if e.alt_name not in data_dict: data_dict[e.alt_name] = {"Alternatif": e.alt_name}
        data_dict[e.alt_name][e.crit_name] = e.value

    df = pd.DataFrame(list(data_dict.values())).set_index("Alternatif")
    saw_engine = SAW(df, types_dict, weights_dict, norm_type=norm_type)
    df_result = saw_engine.calculate_saw().reset_index()
    
    return {"columns": df_result.columns.tolist(), "data": df_result.to_dict(orient="records")}