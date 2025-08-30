import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Download, Filter, Search, BarChart3, Users } from 'lucide-react';

interface QuickActionsProps {
  onAddCustomer: () => void;
  onViewAnalytics: () => void;
  onViewCustomers: () => void;
  onExportData?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onAddCustomer,
  onViewAnalytics,
  onViewCustomers,
  onExportData
}) => {
  const actions = [
    {
      icon: Plus,
      label: 'Müştəri Əlavə Et',
      description: 'Yeni müştəri qeydiyyatı',
      color: 'text-green-600',
      onClick: onAddCustomer
    },
    {
      icon: Users,
      label: 'Müştəri Siyahısı',
      description: 'Bütün müştərilər',
      color: 'text-blue-600',
      onClick: onViewCustomers
    },
    {
      icon: BarChart3,
      label: 'Analitika',
      description: 'Hesabatlar və statistika',
      color: 'text-purple-600',
      onClick: onViewAnalytics
    },
    {
      icon: Download,
      label: 'Export',
      description: 'Məlumatları yüklə',
      color: 'text-orange-600',
      onClick: onExportData
    }
  ];

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="text-lg">Tez Əməliyyatlar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="ghost"
                  className="h-auto p-4 flex flex-col items-center gap-2 w-full hover:bg-primary/5 transition-colors"
                  onClick={action.onClick}
                >
                  <motion.div
                    whileHover={{ rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Icon className={`w-6 h-6 ${action.color}`} />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;