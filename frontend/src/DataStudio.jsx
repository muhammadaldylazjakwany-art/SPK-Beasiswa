import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './DataStudio.css';

export default function DataStudio() {
    const { id } = useParams(); // Tangkap ID project dari URL
    const activeProjectId = parseInt(id);
    const [projectName, setProjectName] = useState("");
    const [activeTab, setActiveTab] = useState("manual"); 

    // State Manual CRUD
    const [criteria, setCriteria] = useState([]);
    const [alternatives, setAlternatives] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [newCritName, setNewCritName] = useState("");
    const [newCritType, setNewCritType] = useState("Benefit");
    const [newAltName, setNewAltName] = useState("");

    // State Upload ETL
    const [previewData, setPreviewData] = useState(null);
    const [columns, setColumns] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [transformRules, setTransformRules] = useState({}); 
    const [activeCritTab, setActiveCritTab] = useState(""); 

    const API_URL = "http://127.0.0.1:8000/api";

    useEffect(() => {
        if (activeProjectId) {
            fetchProjectDetails();
            fetchCriteria(); fetchAlternatives(); fetchEvaluations();
        }
    }, [activeProjectId]);

    const fetchProjectDetails = async () => {
        const res = await axios.get(`${API_URL}/projects`);
        const currentProject = res.data.find(p => p.id === activeProjectId);
        if (currentProject) setProjectName(currentProject.name);
    };

    const fetchCriteria = async () => {
        const res = await axios.get(`${API_URL}/criteria/${activeProjectId}`);
        setCriteria(res.data);
    };

    const fetchAlternatives = async () => {
        const res = await axios.get(`${API_URL}/alternatives/${activeProjectId}`);
        setAlternatives(res.data);
    };

    const fetchEvaluations = async () => {
        const res = await axios.get(`${API_URL}/evaluations/${activeProjectId}`);
        setEvaluations(res.data);
    };

    const handleAddCriteria = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/criteria`, { project_id: activeProjectId, name: newCritName, type: newCritType });
            setNewCritName(""); fetchCriteria();
        } catch (error) { alert("Gagal: " + error.response?.data?.detail); }
    };

    const handleDeleteCriteria = async (critId) => {
        if (window.confirm("Hapus kriteria ini beserta nilainya?")) {
            await axios.delete(`${API_URL}/criteria/${critId}`);
            fetchCriteria(); fetchEvaluations();
        }
    };

    const handleUpdateCriteriaType = async (critId, newType) => {
        await axios.put(`${API_URL}/criteria/${critId}`, { type: newType });
        fetchCriteria();
    };

    const handleAddAlternative = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/alternatives`, { project_id: activeProjectId, name: newAltName });
            setNewAltName(""); fetchAlternatives();
        } catch (error) { alert("Gagal: " + error.response?.data?.detail); }
    };

    const handleDeleteAlternative = async (altId) => {
        if (window.confirm("Hapus alternatif ini?")) {
            await axios.delete(`${API_URL}/alternatives/${altId}`);
            fetchAlternatives(); fetchEvaluations();
        }
    };

    const handleEvalChange = async (altName, critName, value) => {
        const floatVal = parseFloat(value) || 0;
        await axios.post(`${API_URL}/evaluations/single`, {
            project_id: activeProjectId, alt_name: altName, crit_name: critName, value: floatVal
        });
        fetchEvaluations(); 
    };

    const getEvalValue = (altName, critName) => {
        const ev = evaluations.find(e => e.alt_name === altName && e.crit_name === critName);
        return ev ? ev.value : "";
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData(); formData.append("file", file);
        try {
            setIsLoading(true);
            const res = await axios.post(`${API_URL}/upload-preview`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            
            const cols = res.data.columns;
            setColumns(cols);
            setPreviewData(res.data.data); 
            
            const initialRules = {};
            cols.slice(1).forEach(c => { initialRules[c] = { type: "asli" }; });
            setTransformRules(initialRules);
            
            if (cols.length > 1) setActiveCritTab(cols[1]); 
            setIsLoading(false);
        } catch (error) {
            alert("Error: " + (error.response?.data?.detail || error.message));
            setIsLoading(false);
        }
    };

    const getUniqueValues = (colName) => {
        if (!previewData) return [];
        const unique = [...new Set(previewData.map(item => item[colName]))];
        return unique.filter(val => val !== "" && val !== null);
    };

    const handleTypeChange = (col, newType) => {
        setTransformRules(prev => {
            const newState = { ...prev, [col]: { type: newType } };
            if (newType === "mapping") {
                const uniqueVals = getUniqueValues(col);
                const mapObj = {};
                uniqueVals.forEach(v => { mapObj[v] = 0; });
                newState[col].map = mapObj;
            } else if (newType === "binning") {
                newState[col].bins = [{ min: 0, max: 0, scale: 0 }];
            }
            return newState;
        });
    };

    const updateMapping = (col, originalVal, newScale) => {
        setTransformRules(prev => ({
            ...prev, [col]: { ...prev[col], map: { ...prev[col].map, [originalVal]: parseFloat(newScale) || 0 } }
        }));
    };

    const updateBin = (col, index, field, val) => {
        setTransformRules(prev => {
            const newBins = [...prev[col].bins];
            newBins[index] = { ...newBins[index], [field]: parseFloat(val) || 0 };
            return { ...prev, [col]: { ...prev[col], bins: newBins } };
        });
    };
    const addBin = (col) => {
        setTransformRules(prev => ({ ...prev, [col]: { ...prev[col], bins: [...prev[col].bins, { min: 0, max: 0, scale: 0 }] } }));
    };
    const removeBin = (col, index) => {
        setTransformRules(prev => {
            const newBins = [...prev[col].bins];
            newBins.splice(index, 1);
            return { ...prev, [col]: { ...prev[col], bins: newBins } };
        });
    };

    const getTransformedData = () => {
        if (!previewData) return [];
        return previewData.map(row => {
            let newRow = { ...row };
            columns.forEach((col, index) => {
                if (index > 0) { 
                    const rule = transformRules[col] || { type: "asli" };
                    const val = newRow[col];
                    
                    if (rule.type === "mapping" && rule.map) {
                        newRow[col] = rule.map[val] !== undefined ? rule.map[val] : 0;
                    } 
                    else if (rule.type === "binning" && rule.bins) {
                        const numVal = parseFloat(val);
                        if (!isNaN(numVal)) {
                            let matched = false;
                            for (let bin of rule.bins) {
                                if (numVal >= bin.min && numVal <= bin.max) {
                                    newRow[col] = bin.scale;
                                    matched = true; break;
                                }
                            }
                            if (!matched) newRow[col] = 0;
                        } else { newRow[col] = 0; }
                    }
                }
            });
            return newRow;
        });
    };

    const handleSaveBatch = async () => {
        if (!previewData) return;
        try {
            const finalData = getTransformedData();
            await axios.post(`${API_URL}/evaluations/batch`, { project_id: activeProjectId, data: finalData });
            alert("✅ Data Matang berhasil disimpan ke Database!");
            setPreviewData(null); 
            fetchCriteria(); fetchAlternatives(); fetchEvaluations();
            setActiveTab("manual"); 
        } catch (error) { alert("Gagal: " + error.response?.data?.detail); }
    };

    return (
        <div className="studio-container animate-fade-in">
            <div className="header-section" style={{borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px'}}>
                <h2 style={{color: '#1e293b', margin: '0 0 5px 0'}}>🎛️ Manajemen Data</h2>
                <p style={{color: '#64748b', margin: 0}}>Ruang Kerja Aktif: <strong style={{color: '#3b82f6'}}>{projectName || "Memuat..."}</strong></p>
            </div>

            <div className="tab-navigation">
                <button className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')}>
                    📝 Manajemen Manual & Matriks
                </button>
                <button className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
                    📂 Upload & Transformasi Data Excel (ETL)
                </button>
            </div>

            {/* TAB 1: MANUAL */}
            {activeTab === 'manual' && (
                <div className="tab-content">
                    <div className="grid-layout">
                        {/* PANEL KRITERIA */}
                        <div className="card">
                            <h3>1. Kelola Kriteria</h3>
                            <form onSubmit={handleAddCriteria} className="inline-form mb-3">
                                <input type="text" placeholder="Nama Kriteria" value={newCritName} onChange={(e) => setNewCritName(e.target.value)} required className="form-control" />
                                <select value={newCritType} onChange={(e) => setNewCritType(e.target.value)} className="form-control w-auto">
                                    <option value="Benefit">Benefit</option>
                                    <option value="Cost">Cost</option>
                                </select>
                                <button type="submit" className="btn btn-success">Tambah</button>
                            </form>
                            <table className="data-table">
                                <thead><tr><th>Nama</th><th>Tipe</th><th>Aksi</th></tr></thead>
                                <tbody>
                                    {criteria.map(c => (
                                        <tr key={c.id}>
                                            <td>{c.name}</td>
                                            <td>
                                                <select value={c.type} onChange={(e) => handleUpdateCriteriaType(c.id, e.target.value)} className="form-control-small">
                                                    <option value="Benefit">Benefit</option><option value="Cost">Cost</option>
                                                </select>
                                            </td>
                                            <td><button className="btn-icon text-danger" onClick={() => handleDeleteCriteria(c.id)}>🗑️</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* PANEL ALTERNATIF */}
                        <div className="card">
                            <h3>2. Kelola Alternatif</h3>
                            <form onSubmit={handleAddAlternative} className="inline-form mb-3">
                                <input type="text" placeholder="Nama Alternatif" value={newAltName} onChange={(e) => setNewAltName(e.target.value)} required className="form-control" />
                                <button type="submit" className="btn btn-success">Tambah</button>
                            </form>
                            <table className="data-table">
                                <thead><tr><th>Nama Alternatif</th><th>Aksi</th></tr></thead>
                                <tbody>
                                    {alternatives.map(a => (
                                        <tr key={a.id}>
                                            <td>{a.name}</td>
                                            <td><button className="btn-icon text-danger" onClick={() => handleDeleteAlternative(a.id)}>🗑️</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* PANEL MATRIKS */}
                    <div className="card mt-4">
                        <h3>3. Matriks Keputusan (Input Nilai)</h3>
                        {criteria.length === 0 || alternatives.length === 0 ? (
                            <p className="text-muted">Tambahkan minimal 1 kriteria dan 1 alternatif untuk mengisi matriks.</p>
                        ) : (
                            <div className="table-responsive">
                                <table className="data-table matrix-table">
                                    <thead>
                                        <tr>
                                            <th>Alternatif \ Kriteria</th>
                                            {criteria.map(c => <th key={c.id}>{c.name}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {alternatives.map(alt => (
                                            <tr key={alt.id}>
                                                <td className="row-header">{alt.name}</td>
                                                {criteria.map(crit => (
                                                    <td key={`${alt.id}-${crit.id}`}>
                                                        <input 
                                                            type="number" step="any" className="matrix-input"
                                                            defaultValue={getEvalValue(alt.name, crit.name)}
                                                            onBlur={(e) => handleEvalChange(alt.name, crit.name, e.target.value)}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                
                                <div className="action-bar mt-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <p className="text-muted" style={{ margin: 0 }}>* Nilai sebenarnya sudah tersimpan otomatis setiap kali Anda mengetik.</p>
                                    <button className="btn btn-primary" onClick={() => { fetchEvaluations(); alert("✅ Seluruh data matriks telah dikonfirmasi tersimpan di Database!"); }}>
                                        💾 Konfirmasi & Simpan Matriks
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: UPLOAD & ADVANCED ETL */}
            {activeTab === 'upload' && (
                <div className="tab-content card">
                    <h3>📂 1. Upload Data & Transformasi</h3>
                    <p className="text-muted">Format file: Kolom pertama untuk Nama Alternatif, kolom berikutnya untuk nama Kriteria.</p>
                    <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="file-input" />
                    {isLoading && <p className="loading-state">Membaca file...</p>}

                    {previewData && (
                        <div className="mt-4 animate-fade-in">
                            <h4>👀 Preview Data Mentah (Sebelum Transformasi)</h4>
                            <div className="table-responsive" style={{marginBottom: '30px', maxHeight: '250px', overflowY: 'auto'}}>
                                <table className="data-table">
                                    <thead style={{position: 'sticky', top: 0}}>
                                        <tr>{columns.map((col) => <th key={col}>{col}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {previewData.slice(0, 10).map((row, idx) => (
                                            <tr key={idx}>{columns.map(col => <td key={col}>{row[col]}</td>)}</tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <hr style={{borderTop: '1px dashed #cbd5e1', margin: '30px 0'}} />

                            <h4>🪄 2. Transformasi & Penskalaan (ETL)</h4>
                            <p className="text-muted">Atur aturan penskalaan untuk setiap kriteria. Jika data sudah berupa angka final, pilih 'Tidak Ada Transformasi'.</p>
                            
                            <div style={{display: 'flex', gap: '5px', overflowX: 'auto', marginBottom: '15px', borderBottom: '2px solid #e2e8f0'}}>
                                {columns.slice(1).map(col => (
                                    <button 
                                        key={col} 
                                        onClick={() => setActiveCritTab(col)}
                                        style={{
                                            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold',
                                            color: activeCritTab === col ? '#3b82f6' : '#64748b',
                                            borderBottom: activeCritTab === col ? '3px solid #3b82f6' : '3px solid transparent',
                                            marginBottom: '-2px'
                                        }}
                                    >
                                        {col}
                                    </button>
                                ))}
                            </div>

                            {activeCritTab && transformRules[activeCritTab] && (
                                <div style={{background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '30px'}}>
                                    <h5 style={{marginTop: 0}}>Metode Transformasi Data untuk '{activeCritTab}':</h5>
                                    <div style={{display: 'flex', gap: '20px', marginBottom: '20px'}}>
                                        <label><input type="radio" name="transformType" checked={transformRules[activeCritTab].type === "asli"} onChange={() => handleTypeChange(activeCritTab, "asli")} /> Tidak Ada Transformasi</label>
                                        <label><input type="radio" name="transformType" checked={transformRules[activeCritTab].type === "mapping"} onChange={() => handleTypeChange(activeCritTab, "mapping")} /> Mapping Teks/Kategori</label>
                                        <label><input type="radio" name="transformType" checked={transformRules[activeCritTab].type === "binning"} onChange={() => handleTypeChange(activeCritTab, "binning")} /> Penskalaan Rentang Angka (Binning)</label>
                                    </div>

                                    {transformRules[activeCritTab].type === "mapping" && (
                                        <div className="animate-fade-in" style={{background: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #cbd5e1'}}>
                                            <p className="text-muted" style={{marginTop: 0}}>Ubah nilai teks unik menjadi angka final.</p>
                                            <table className="data-table" style={{width: 'auto', minWidth: '400px'}}>
                                                <thead><tr><th>Data Asli di File</th><th>Skala Numerik</th></tr></thead>
                                                <tbody>
                                                    {Object.keys(transformRules[activeCritTab].map || {}).map(val => (
                                                        <tr key={val}>
                                                            <td style={{background: '#f1f5f9', fontWeight: 'bold'}}>{val}</td>
                                                            <td>
                                                                <input type="number" step="any" className="form-control-small" 
                                                                    value={transformRules[activeCritTab].map[val]} 
                                                                    onChange={(e) => updateMapping(activeCritTab, val, e.target.value)} 
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {transformRules[activeCritTab].type === "binning" && (
                                        <div className="animate-fade-in" style={{background: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #cbd5e1'}}>
                                            <p className="text-muted" style={{marginTop: 0}}>Tentukan batas rentang angka. Contoh: Harga 0 - 1000000 -> Nilai Skala 1.</p>
                                            <table className="data-table">
                                                <thead><tr><th>Batas Bawah (Min)</th><th>Batas Atas (Max)</th><th>Skala Numerik</th><th>Aksi</th></tr></thead>
                                                <tbody>
                                                    {(transformRules[activeCritTab].bins || []).map((bin, idx) => (
                                                        <tr key={idx}>
                                                            <td><input type="number" step="any" className="form-control" value={bin.min} onChange={(e) => updateBin(activeCritTab, idx, 'min', e.target.value)} /></td>
                                                            <td><input type="number" step="any" className="form-control" value={bin.max} onChange={(e) => updateBin(activeCritTab, idx, 'max', e.target.value)} /></td>
                                                            <td><input type="number" step="any" className="form-control" value={bin.scale} onChange={(e) => updateBin(activeCritTab, idx, 'scale', e.target.value)} style={{background: '#f0fdf4'}}/></td>
                                                            <td style={{textAlign: 'center'}}><button className="btn-icon text-danger" onClick={() => removeBin(activeCritTab, idx)}>🗑️</button></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <button className="btn btn-success" onClick={() => addBin(activeCritTab)} style={{marginTop: '10px', fontSize: '0.85rem'}}>➕ Tambah Rentang</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <hr style={{borderTop: '1px solid #e2e8f0', margin: '30px 0'}} />

                            <h4>✅ 3. Data Hasil Transformasi (Ready to Load)</h4>
                            <div className="table-responsive">
                                <table className="data-table" style={{border: '2px solid #10b981'}}>
                                    <thead><tr>{columns.map(col => <th key={col} style={{background: '#059669'}}>{col}</th>)}</tr></thead>
                                    <tbody>
                                        {getTransformedData().slice(0, 10).map((row, idx) => (
                                            <tr key={idx}>{columns.map(col => <td key={col}>{row[col]}</td>)}</tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            <button className="btn btn-primary btn-large mt-3" onClick={handleSaveBatch} style={{background: '#10b981', border: 'none', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'}}>
                                💾 Simpan Data Transformasi Akhir ke Database
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}