import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './Home';
import DataStudio from './DataStudio';
import AhpMatrix from './AhpMatrix';
import SawAnalysis from './SawAnalysis';
import Materi from './Materi';

// Komponen Layout agar Header dan Footer dinamis
const Layout = ({ children }) => {
  const location = useLocation();
  const isWorkspace = location.pathname.includes('/project/');
  const projectId = location.pathname.split('/')[2];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <nav style={styles.navbar}>
        <div style={styles.logo}>⚡ SPK: <span style={{color: 'white'}}>Hybrid AHP-SAW</span></div>
        <div style={styles.navLinks}>
          <Link to="/" style={styles.link}>🏠 Beranda Studi Kasus</Link>
          <Link to="/materi" style={styles.link}>📖 Modul Akademik</Link>
          
          {isWorkspace && (
            <>
              <span style={{color: '#64748b', margin: '0 10px'}}>|</span>
              <Link to={`/project/${projectId}/data`} style={styles.link}>1. Manajemen Data & ETL</Link>
              <Link to={`/project/${projectId}/ahp`} style={styles.link}>2. Kalibrasi Bobot (AHP)</Link>
              <Link to={`/project/${projectId}/saw`} style={styles.link}>3. Evaluasi & Pemeringkatan (SAW)</Link>
            </>
          )}
        </div>
      </nav>

      <div style={styles.content}>
        {children}
      </div>

      <footer style={styles.footer}>
        Copyright &copy; 2026 Ahmad Fauzi. Hak Cipta Dilindungi Undang-Undang.
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/materi" element={<Materi />} />
          <Route path="/project/:id/data" element={<DataStudio />} />
          <Route path="/project/:id/ahp" element={<AhpMatrix />} />
          <Route path="/project/:id/saw" element={<SawAnalysis />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

const styles = {
  navbar: { background: '#0f172a', padding: '15px 30px', display: 'flex', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  logo: { color: '#38bdf8', fontSize: '1.2rem', fontWeight: 'bold', marginRight: '30px', letterSpacing: '0.5px' },
  navLinks: { display: 'flex', gap: '15px', alignItems: 'center' },
  link: { color: '#cbd5e1', textDecoration: 'none', fontWeight: '600', padding: '8px 12px', borderRadius: '6px', fontSize: '0.95rem' },
  content: { padding: '30px', background: '#f8fafc', flex: 1, fontFamily: 'Segoe UI, Tahoma, sans-serif' },
  footer: { background: '#1e293b', color: '#94a3b8', textAlign: 'center', padding: '15px', fontSize: '0.9rem', marginTop: 'auto' }
};