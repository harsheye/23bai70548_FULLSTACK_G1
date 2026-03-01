import { Link, Outlet } from "react-router-dom"

const DashboardLayout = () => {
    return (
        <div className="dashboard-card">
            <h3 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: 8 }}>Dashboard</h3>
            <nav style={{display: 'flex', gap: '20px'}}>
                <Link style={{ color: '#222', textDecoration: 'none', fontWeight: 'bold' }} to="/summary">Summary</Link>
                <Link style={{ color: '#222', textDecoration: 'none', fontWeight: 'bold' }} to="/analytics">Analytics</Link>
                <Link style={{ color: '#222', textDecoration: 'none', fontWeight: 'bold' }} to="/logs">Logs</Link>
            </nav>
            <hr style={{ borderColor: '#333' }} />
            <Outlet />
        </div>
    )
}

export default DashboardLayout;