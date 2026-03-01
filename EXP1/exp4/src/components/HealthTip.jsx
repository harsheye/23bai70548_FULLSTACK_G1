import React, { useEffect, useState } from 'react';

export default function HealthTip() {
  const [tip, setTip] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('https://api.adviceslip.com/advice')
      .then(res => res.json())
      .then(data => {
        setTip(data.slip.advice);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch tip');
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading health tip...</div>;
  if (error) return <div>{error}</div>;
  return <div>Today's Health Tip: {tip}</div>;
}
