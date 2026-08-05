import React, { useState, useEffect, useRef } from 'react';

function CountUp({ end = 0, duration = 1000, decimals = 0, prefix = '', suffix = '' }) {
  const [count, setCount] = useState(0);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const targetValue = parseFloat(end) || 0;
    const startValue = 0;
    const startTime = performance.now();

    const updateCount = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      
      // Easing function (easeOutExpo)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = startValue + (targetValue - startValue) * easeProgress;

      setCount(currentVal);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(updateCount);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateCount);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [end, duration]);

  const formattedCount = count.toFixed(decimals);

  return (
    <span>
      {prefix}
      {formattedCount}
      {suffix}
    </span>
  );
}

export default CountUp;
