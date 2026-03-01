const Dashboard = ({ carbonLogs }) => {
  const total = carbonLogs.reduce((acc, x) => {
    return acc + x.carbon;
  }, 0);

  return (
    <div className="dashboard-card">
      <p style={{ fontWeight: 'bold', fontSize: 18 }}>Total Carbon Footprint: {total} kg</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {carbonLogs.map((log) => (
          <li key={log.id} style={{ borderBottom: '1px solid #333', padding: '0.5rem 0' }}>
            <span>{log.activity}</span> = <span style={{ color: '#0ff' }}>{log.carbon} kg</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;