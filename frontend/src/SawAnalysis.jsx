import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import './SawAnalysis.css';

export default function SawAnalysis() {
    const { id } = useParams();
    const activeProjectId = parseInt(id);
    const [projectName, setProjectName] = useState("");
    
    const [normType, setNormType] = useState("linear"); 
    const [resultData, setResultData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const API_URL = "http://127.0.0.1:8000/api";

    useEffect(() => {
        if (activeProjectId) {
            axios.get(`${API_URL}/projects`).then(res => {
                const currentProject = res.data.find(p => p.id === activeProjectId);
                if (currentProject) setProjectName(currentProject.name);
            });
        }
    }, [activeProjectId]);

    const handleCalculateSAW = async () => {
        setIsLoading(true);
        setResultData([]); 
        try {
            const res = await axios.get(`${API_URL}/saw/calculate/${activeProjectId}?norm_type=${normType}`);
            setColumns(res.data.columns);
            setResultData(res.data.data);
        } catch (error) {
            alert("Gagal memproses: " + (error.response?.data?.detail || error.message));
        } finally { setIsLoading(false); }
    };

    const handleExportExcel = () => {
        if (resultData.length === 0) return alert("Belum ada data.");
        const worksheet = XLSX.utils.json_to_sheet(resultData);
        const columnWidths = columns.map(() => ({ wch: 15 }));
        columnWidths[0] = { wch: 25 }; 
        worksheet['!cols'] = columnWidths;
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil_SAW");
        XLSX.writeFile(workbook, `Laporan_SAW_${projectName}.xlsx`);
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip">
                    <p className="tooltip-label">{`Alternatif: ${label}`}</p>
                    <p className="tooltip-score">{`Skor: ${payload[0].value.toFixed(4)}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="saw-container animate-fade-in">
            <div className="header-section" style={{borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px'}}>
                <h2 style={{color: '#1e293b', margin: '0 0 5px 0'}}>🏆 Pemeringkatan Akhir (SAW)</h2>
                <p style={{color: '#64748b', margin: 0}}>Ruang Kerja Aktif: <strong style={{color: '#3b82f6'}}>{projectName || "Memuat..."}</strong></p>
            </div>

            <div className="card top-panel">
                <div className="form-group row-flex" style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    <label style={{fontWeight: 'bold'}}>Metode Normalisasi:</label>
                    <select value={normType} onChange={(e) => setNormType(e.target.value)} className="form-control" style={{maxWidth: '300px'}}>
                        <option value="linear">1. Linear (Klasik SAW)</option>
                        <option value="minmax">2. Min-Max (Skala 0-1)</option>
                        <option value="sum">3. Sum (Proporsi Persentase)</option>
                    </select>

                    <button className="btn btn-primary btn-large ml-auto" onClick={handleCalculateSAW} disabled={isLoading} style={{margin: 0}}>
                        {isLoading ? "⏳ Memproses..." : "🚀 Hitung Peringkat"}
                    </button>
                </div>
            </div>

            {resultData.length > 0 && (
                <div className="card result-panel animate-fade-in">
                    <div className="winner-banner">
                        🎉 Keputusan Terbaik: <strong>{resultData[0]['Alternatif']}</strong> dengan Skor Akhir {resultData[0]['Skor Akhir'].toFixed(4)}
                    </div>

                    <div className="chart-container">
                        <h3 className="chart-title">📊 Perbandingan Skor Akhir</h3>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={resultData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="Alternatif" tick={{ fill: '#475569', fontSize: 12 }} tickMargin={10} />
                                <YAxis domain={[0, 'dataMax + 0.1']} tick={{ fill: '#475569', fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f1f5f9'}} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Skor Akhir" name="Skor SAW" radius={[6, 6, 0, 0]} animationDuration={1500}>
                                    {resultData.map((entry, index) => (<Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#3b82f6'} />))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="result-header">
                        <h3>Tabel Hasil Pemeringkatan</h3>
                        <button className="btn btn-success" onClick={handleExportExcel}>📥 Download Laporan</button>
                    </div>

                    <div className="table-responsive">
                        <table className="data-table">
                            <thead><tr>{columns.map(col => <th key={col}>{col}</th>)}</tr></thead>
                            <tbody>
                                {resultData.map((row, idx) => (
                                    <tr key={idx} className={row['Peringkat'] <= 3 ? "top-rank" : ""}>
                                        {columns.map(col => {
                                            let cellValue = row[col];
                                            if (typeof cellValue === 'number' && col !== 'Peringkat') cellValue = cellValue.toFixed(4);
                                            if (col === 'Peringkat') return (<td key={col}><span className={`rank-badge rank-${cellValue}`}>#{cellValue}</span></td>);
                                            return <td key={col}>{cellValue}</td>;
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}