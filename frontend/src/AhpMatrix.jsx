import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './AhpMatrix.css';

export default function AhpMatrix() {
    const { id } = useParams();
    const activeProjectId = parseInt(id);
    const [projectName, setProjectName] = useState("");
    
    const [criteria, setCriteria] = useState([]);
    const [inputMatrix, setInputMatrix] = useState([]);
    const [result, setResult] = useState(null);

    const API_URL = "http://127.0.0.1:8000/api";

    useEffect(() => {
        if (activeProjectId) {
            fetchProjectDetails();
            fetchCriteriaData();
        }
    }, [activeProjectId]);

    const fetchProjectDetails = async () => {
        const res = await axios.get(`${API_URL}/projects`);
        const currentProject = res.data.find(p => p.id === activeProjectId);
        if (currentProject) setProjectName(currentProject.name);
    };

    const fetchCriteriaData = async () => {
        const res = await axios.get(`${API_URL}/criteria/${activeProjectId}`);
        const critNames = res.data.map(c => c.name);
        setCriteria(critNames);
        const n = critNames.length;
        
        const savedMatrix = localStorage.getItem(`ahp_matrix_${activeProjectId}`);
        const savedResult = localStorage.getItem(`ahp_result_${activeProjectId}`);

        if (savedMatrix) {
            const parsedMatrix = JSON.parse(savedMatrix);
            if (parsedMatrix.length === n) {
                setInputMatrix(parsedMatrix);
                if (savedResult) setResult(JSON.parse(savedResult));
                return; 
            }
        }

        const initialMatrix = Array(n).fill(null).map((_, i) =>
            Array(n).fill("").map((_, j) => (i === j ? "1" : ""))
        );
        setInputMatrix(initialMatrix);
        setResult(null);
    };

    const parseValue = (val) => {
        if (!val) return 0;
        if (String(val).includes('/')) {
            const [num, den] = val.split('/');
            return parseFloat(num) / parseFloat(den);
        }
        return parseFloat(val);
    };

    const handleInputChange = (i, j, value) => {
        const newMatrix = [...inputMatrix];
        newMatrix[i][j] = value;
        setInputMatrix(newMatrix);
        
        if (activeProjectId) {
            localStorage.setItem(`ahp_matrix_${activeProjectId}`, JSON.stringify(newMatrix));
            setResult(null);
            localStorage.removeItem(`ahp_result_${activeProjectId}`);
        }
    };

    const hitungAHP = async () => {
        const decimalMatrix = inputMatrix.map(row => row.map(val => parseValue(val)));
        try {
            const res = await axios.post(`${API_URL}/ahp/calculate`, { criteria: criteria, matrix: decimalMatrix });
            setResult(res.data);
            localStorage.setItem(`ahp_result_${activeProjectId}`, JSON.stringify(res.data));
        } catch (error) { alert("Gagal menghitung. Pastikan semua sel terisi angka valid!"); }
    };

    const simpanBobot = async () => {
        if (!result) return;
        if (!result.is_consistent) return alert("Matriks tidak konsisten!");

        const weightDict = {};
        criteria.forEach((c, i) => { weightDict[c] = result.weights[i]; });

        try {
            await axios.post(`${API_URL}/criteria/save-weights`, { project_id: activeProjectId, weights: weightDict });
            alert("✅ Bobot prioritas berhasil disimpan!");
        } catch (error) { alert("Gagal menyimpan bobot."); }
    };

    return (
        <div className="ahp-container animate-fade-in">
            <div className="header-section" style={{borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px'}}>
                <h2 style={{color: '#1e293b', margin: '0 0 5px 0'}}>⚖️ Pembobotan Kriteria (AHP)</h2>
                <p style={{color: '#64748b', margin: 0}}>Ruang Kerja Aktif: <strong style={{color: '#3b82f6'}}>{projectName || "Memuat..."}</strong></p>
            </div>

            {/* TABEL PANDUAN SAATY YANG DIPERBARUI */}
            <div style={{background: '#ffffff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
                <h4 style={{margin: '0 0 15px 0', color: '#1e293b'}}>Panduan Skala Penilaian Saaty (1-9)</h4>
                <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem'}}>
                        <thead>
                            <tr style={{background: '#f1f5f9', borderBottom: '2px solid #cbd5e1'}}>
                                <th style={{padding: '10px', width: '10%', color: '#334155'}}>Nilai</th>
                                <th style={{padding: '10px', width: '35%', color: '#334155'}}>Definisi Verbal</th>
                                <th style={{padding: '10px', width: '55%', color: '#334155'}}>Penjelasan</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{borderBottom: '1px solid #f1f5f9'}}><td style={{padding: '8px 10px'}}><strong>1</strong></td><td style={{fontWeight: '600'}}>Sama penting</td><td>Kedua kriteria memiliki kontribusi yang setara terhadap tujuan.</td></tr>
                            <tr style={{borderBottom: '1px solid #f1f5f9', background: '#fafafa', color: '#64748b'}}><td style={{padding: '8px 10px'}}><strong>2</strong></td><td>Di antara 1 dan 3</td><td>Nilai kompromi antara sama dan sedikit lebih penting.</td></tr>
                            <tr style={{borderBottom: '1px solid #f1f5f9'}}><td style={{padding: '8px 10px'}}><strong>3</strong></td><td style={{fontWeight: '600'}}>Sedikit lebih penting</td><td>Pengalaman dan penilaian sedikit mendukung satu kriteria.</td></tr>
                            <tr style={{borderBottom: '1px solid #f1f5f9', background: '#fafafa', color: '#64748b'}}><td style={{padding: '8px 10px'}}><strong>4</strong></td><td>Di antara 3 dan 5</td><td>Nilai kompromi antara sedikit dan cukup lebih penting.</td></tr>
                            <tr style={{borderBottom: '1px solid #f1f5f9'}}><td style={{padding: '8px 10px'}}><strong>5</strong></td><td style={{fontWeight: '600'}}>Cukup lebih penting</td><td>Pengalaman kuat mendukung satu kriteria di atas yang lain.</td></tr>
                            <tr style={{borderBottom: '1px solid #f1f5f9', background: '#fafafa', color: '#64748b'}}><td style={{padding: '8px 10px'}}><strong>6</strong></td><td>Di antara 5 dan 7</td><td>Nilai kompromi antara cukup dan sangat lebih penting.</td></tr>
                            <tr style={{borderBottom: '1px solid #f1f5f9'}}><td style={{padding: '8px 10px'}}><strong>7</strong></td><td style={{fontWeight: '600'}}>Sangat lebih penting</td><td>Satu kriteria sangat dominan; keunggulan terbukti dalam praktik.</td></tr>
                            <tr style={{borderBottom: '1px solid #f1f5f9', background: '#fafafa', color: '#64748b'}}><td style={{padding: '8px 10px'}}><strong>8</strong></td><td>Di antara 7 dan 9</td><td>Nilai kompromi antara sangat dan mutlak lebih penting.</td></tr>
                            <tr style={{borderBottom: '1px solid #f1f5f9'}}><td style={{padding: '8px 10px'}}><strong>9</strong></td><td style={{fontWeight: '600'}}>Mutlak lebih penting</td><td>Bukti terkuat dominansi absolut satu kriteria di atas yang lain.</td></tr>
                            <tr style={{background: '#eff6ff'}}><td style={{padding: '8px 10px', color: '#2563eb'}}><strong>1/n</strong></td><td style={{color: '#2563eb', fontWeight: '600'}}>Nilai Resiprokal</td><td style={{color: '#1e40af'}}>Jika kriteria A dinilai 3 terhadap B, maka B dinilai 1/3 terhadap A.</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {criteria.length > 0 ? (
                <>
                    <div className="tables-wrapper">
                        <div className="table-box">
                            <h3>1. Tabel Input Perbandingan</h3>
                            <div className="table-scroll">
                                <table className="ahp-table">
                                    <thead><tr><th>Kriteria</th>{criteria.map(c => <th key={c}>{c}</th>)}</tr></thead>
                                    <tbody>
                                        {criteria.map((cRow, i) => (
                                            <tr key={cRow}>
                                                <td className="row-header">{cRow}</td>
                                                {criteria.map((_, j) => (
                                                    <td key={`${i}-${j}`}>
                                                        <input type="text" value={inputMatrix[i]?.[j] || ""} onChange={(e) => handleInputChange(i, j, e.target.value)} disabled={i === j} className={i === j ? "diagonal" : ""} />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="table-box">
                            <h3>2. Tabel Desimal (Sistem)</h3>
                            <div className="table-scroll">
                                <table className="ahp-table decimal-table">
                                    <thead><tr><th>Kriteria</th>{criteria.map(c => <th key={c}>{c}</th>)}</tr></thead>
                                    <tbody>
                                        {criteria.map((cRow, i) => (
                                            <tr key={cRow}>
                                                <td className="row-header">{cRow}</td>
                                                {criteria.map((_, j) => {
                                                    const val = parseValue(inputMatrix[i]?.[j]);
                                                    return <td key={`${i}-${j}`}>{val === 0 ? "-" : val.toFixed(2)}</td>;
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="action-center">
                        <button className="btn btn-primary btn-large" onClick={hitungAHP}>⚙️ Hitung Rasio Konsistensi & Bobot</button>
                    </div>

                    {result && (
                        <div className="card result-box animate-fade-in">
                            <h3>🎉 Hasil Analisis AHP</h3>
                            <div className="metrics">
                                <div className={`badge-cr ${result.is_consistent ? 'success' : 'error'}`}>
                                    Consistency Ratio (CR): {result.cr.toFixed(4)} 
                                    {result.is_consistent ? " (KONSISTEN ✅)" : " (TIDAK KONSISTEN ❌)"}
                                </div>
                            </div>
                            <table className="data-table mt-3">
                                <thead><tr><th>Kriteria</th><th>Bobot Prioritas</th></tr></thead>
                                <tbody>
                                    {result.criteria.map((c, i) => (
                                        <tr key={c}><td>{c}</td><td><strong>{(result.weights[i] * 100).toFixed(2)} %</strong></td></tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="action-center mt-4">
                                <button className={`btn btn-large ${result.is_consistent ? 'btn-success' : 'btn-disabled'}`} onClick={simpanBobot} disabled={!result.is_consistent}>
                                    💾 Simpan Bobot ke Database
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : ( <div className="card text-center"><p className="text-muted">Silakan tambahkan kriteria di Data Studio terlebih dahulu.</p></div> )}
        </div>
    );
}