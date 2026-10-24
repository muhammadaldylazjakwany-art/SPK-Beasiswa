import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Home() {
    const [projects, setProjects] = useState([]);
    const [newProjectName, setNewProjectName] = useState("");
    const navigate = useNavigate();
    const API_URL = "http://127.0.0.1:8000/api";

    useEffect(() => { fetchProjects(); }, []);

    const fetchProjects = async () => {
        const res = await axios.get(`${API_URL}/projects`);
        setProjects(res.data);
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/projects`, { name: newProjectName });
            setNewProjectName("");
            fetchProjects();
        } catch (error) { alert("Gagal membuat project."); }
    };

    const handleDeleteProject = async (id) => {
        if(window.confirm("AWAS! Hapus project ini beserta semua data kriteria dan nilainya?")) {
            await axios.delete(`${API_URL}/projects/${id}`);
            fetchProjects();
        }
    };

    return (
        <div style={{maxWidth: '800px', margin: '0 auto', background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
            <h2>📁 Manajemen Project Praktikum</h2>
            <form onSubmit={handleCreateProject} style={{display: 'flex', gap: '10px', marginBottom: '30px'}}>
                <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Nama Studi Kasus Baru..." required style={{flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc'}} />
                <button type="submit" style={{padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>➕ Buat Project</button>
            </form>

            <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                    <tr style={{background: '#1e293b', color: 'white'}}>
                        <th style={{padding: '12px', textAlign: 'left'}}>Nama Project</th>
                        <th style={{padding: '12px', textAlign: 'center'}}>Aksi Buka Workspace</th>
                    </tr>
                </thead>
                <tbody>
                    {projects.map(p => (
                        <tr key={p.id} style={{borderBottom: '1px solid #eee'}}>
                            <td style={{padding: '12px', fontWeight: 'bold'}}>{p.name}</td>
                            <td style={{padding: '12px', textAlign: 'center'}}>
                                <button onClick={() => navigate(`/project/${p.id}/data`)} style={{padding: '8px 15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px', cursor: 'pointer'}}>🚀 Buka</button>
                                <button onClick={() => handleDeleteProject(p.id)} style={{padding: '8px 15px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>🗑️ Hapus</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}