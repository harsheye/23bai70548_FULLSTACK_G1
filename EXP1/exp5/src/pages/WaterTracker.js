import { useState, useEffect, useCallback } from 'react';
import CounterDisplay from '../components/CounterDisplay';

const WaterTracker = () => {
  const [count, setCount] = useState(() => Number(localStorage.getItem('waterCount')) || 0);
  const [goal, setGoal] = useState(8);
  const [tip, setTip] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem('waterCount', count);
  }, [count]);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch('https://api.adviceslip.com/advice')
      .then(res => res.json())
      .then(data => {
        setTip(data.slip.advice);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch health tip');
        setLoading(false);
      });
  }, []);

  const addWater = useCallback(() => setCount(c => c + 1), []);
  const removeWater = useCallback(() => setCount(c => (c > 0 ? c - 1 : 0)), []);
  const reset = useCallback(() => setCount(0), []);
  const saveGoal = useCallback(e => setGoal(Number(e.target.value)), []);

  return (
    <div className="card">
      <h2 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: 8 }}>Daily Water Tracker</h2>
      <CounterDisplay count={count} goal={goal} />
      <div style={{ margin: '1rem 0', display: 'flex', gap: '0.5rem' }}>
        <button style={{ background: '#222', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 4, cursor: 'pointer' }} onClick={addWater}>+</button>
        <button style={{ background: '#222', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 4, cursor: 'pointer' }} onClick={removeWater}>-</button>
        <button style={{ background: '#444', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 4, cursor: 'pointer' }} onClick={reset}>Reset</button>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ color: '#fff' }}>Daily Goal: </label>
        <input type="number" value={goal} min={1} onChange={saveGoal} style={{ background: '#222', color: '#fff', border: '1px solid #333', borderRadius: 4, padding: '0.25rem', width: 60 }} />
        <button style={{ background: '#222', color: '#fff', border: 'none', padding: '0.25rem 0.75rem', borderRadius: 4, marginLeft: 8, cursor: 'pointer' }} onClick={() => setGoal(goal)}>Save Goal</button>
      </div>
      <div style={{ margin: '1rem 0', fontWeight: 'bold' }}>
        {count >= goal && <span style={{ color: '#0f0' }}>Goal Reached</span>}
        <div>{count} / {goal} glasses completed</div>
      </div>
      <div style={{ fontStyle: 'italic', color: '#ccc' }}>
        {loading ? 'Loading health tip...' : error ? error : `Today’s Health Tip: ${tip}`}
      </div>
    </div>
  );
};

export default WaterTracker;
