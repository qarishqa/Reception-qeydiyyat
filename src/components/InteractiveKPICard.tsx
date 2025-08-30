import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

interface InteractiveKPICardProps {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
  onClick?: () => void;
}

const InteractiveKPICard: React.FC<InteractiveKPICardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  color = "text-primary",
  onClick
}) => {
  return (
    <motion.div
      whileHover={{ 
        scale: 1.02,
        y: -2
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Card 
        className={`card-elevated cursor-pointer transition-all duration-300 hover:shadow-lg ${onClick ? 'hover:border-primary/50' : ''}`}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <motion.div
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Icon className={`h-4 w-4 ${color}`} />
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <AnimatedCounter 
                value={value} 
                className="text-2xl font-bold text-foreground"
              />
              {trend && (
                <motion.div 
                  className={`flex items-center text-xs mt-1 ${
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <span className="mr-1">
                    {trend.isPositive ? '↗' : '↘'}
                  </span>
                  {Math.abs(trend.value)}%
                </motion.div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default InteractiveKPICard;