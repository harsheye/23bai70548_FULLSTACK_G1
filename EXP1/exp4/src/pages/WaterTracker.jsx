import React, { useState, useEffect, useCallback, useMemo } from 'react';
import HealthTip from '../components/HealthTip';

const CounterDisplay = React.memo(({ count, goal }) => {
  return (
    <div>
      <h2>Water Intake</h2>
      <p>{count} / {goal} glasses completed</p>
      {count >= goal && <span style={{color:'green'}}>Goal Reached</span>}
    </div>
  );
});

export default function WaterTracker() {
  const [count, setCount] = useState(0);
  const [goal, setGoal] = useState(8);
  const [inputGoal, setInputGoal] = useState(8);

  useEffect(() => {
    const saved = localStorage.getItem('waterCount');
    if (saved) setCount(Number(saved));
    const savedGoal = localStorage.getItem('waterGoal');
    if (savedGoal) {
      setGoal(Number(savedGoal));
      setInputGoal(Number(savedGoal));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('waterCount', count);
  }, [count]);

  useEffect(() => {
    localStorage.setItem('waterGoal', goal);
  }, [goal]);

  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => Math.max(0, c - 1)), []);
  const reset = useCallback(() => setCount(0), []);
  const saveGoal = useCallback(() => setGoal(Number(inputGoal)), [inputGoal]);

  return (
    <div style={{maxWidth:400,margin:'2rem auto',padding:'1rem',border:'1px solid #ccc',borderRadius:8}}>
      <nav style={{marginBottom:'1rem'}}>
        <a href="/dashboard">Dashboard</a> | <a href="/dashboard/water">Water Tracker</a> | <a href="/logout">Logout</a>
      </nav>
      <CounterDisplay count={count} goal={goal} />
      <div style={{margin:'1rem 0'}}>
        <button onClick={increment}>+</button>
        <button onClick={decrement} style={{marginLeft:8}}>-</button>
        <button onClick={reset} style={{marginLeft:8}}>Reset</button>
      </div>
      <div style={{margin:'1rem 0'}}>
        <input type="number" value={inputGoal} min={1} onChange={e => setInputGoal(e.target.value)} />
        <button onClick={saveGoal} style={{marginLeft:8}}>Save Goal</button>
      </div>
      <HealthTip />
    </div>
  );
}
