import React, { useState, useEffect } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');

 
  useEffect(() => {
    if (count < 0) {
      setCount(0);
    } else if (count > 10) {
      setCount(0);
    }
  }, [count]);

  const increment = () => {
    if (count < 10) {
      setCount(count + 1);
      if (count + 1 === 10) {
        setMessage('You have reached the max count of 10!');
      } else {
        setMessage('');
      }
    }
  };

  const decrement = () => {
    if (count > 0) {
      setCount(count - 1);
      setMessage('');
    }
  };

  const reset = () => {
    setCount(0);
    setMessage('');
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <h1>Counter: {count}</h1>
      <button onClick={decrement} disabled={count === 0}>
        Decrement
      </button>
      <button onClick={increment} disabled={count === 10} style={{ marginLeft: '1rem' }}>
        Increment
      </button>
      <button onClick={reset} style={{ marginLeft: '1rem' }}>
        Reset
      </button>
      {message && <p style={{ color: 'red', marginTop: '1rem' }}>{message}</p>}
    </div>
  );
}

export default Counter;
