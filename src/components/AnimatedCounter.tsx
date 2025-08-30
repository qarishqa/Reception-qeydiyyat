import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ 
  value, 
  duration = 2, 
  className = "" 
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / (duration * 1000);

      if (progress < 1) {
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.floor(value * easeOutCubic));
        animationId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    if (value > 0) {
      animationId = requestAnimationFrame(animate);
    } else {
      setDisplayValue(0);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [value, duration]);

  return (
    <motion.span 
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {displayValue}
    </motion.span>
  );
};

export default AnimatedCounter;