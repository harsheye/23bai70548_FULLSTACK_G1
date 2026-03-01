import React from 'react';

const CounterDisplay = React.memo(({ count, goal }) => {
  return (
    <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#fff', background: '#222', padding: '0.5rem', borderRadius: 4, textAlign: 'center' }}>
      {count} / {goal} glasses
    </div>
  );
});

export default CounterDisplay;
