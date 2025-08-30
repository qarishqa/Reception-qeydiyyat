import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, X, User, Car, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  type: 'new_customer' | 'goal_reached' | 'milestone';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const DashboardNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Simulate real-time notifications
    const interval = setInterval(checkForNewCustomers, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const checkForNewCustomers = async () => {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data: recentCustomers, error } = await supabase
        .from('customers')
        .select('full_name, created_at')
        .gte('created_at', fifteenMinutesAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (recentCustomers && recentCustomers.length > 0) {
        const newNotifications = recentCustomers.map(customer => ({
          id: `customer-${Date.now()}-${Math.random()}`,
          type: 'new_customer' as const,
          title: 'Yeni Müştəri',
          message: `${customer.full_name} sistemi əlavə edildi`,
          timestamp: new Date(customer.created_at),
          read: false
        }));

        setNotifications(prev => [...newNotifications, ...prev].slice(0, 10));
      }
    } catch (error) {
      console.error('Error checking for new customers:', error);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_customer':
        return <User className="w-4 h-4" />;
      case 'goal_reached':
        return <TrendingUp className="w-4 h-4" />;
      case 'milestone':
        return <Car className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1"
          >
            <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {unreadCount}
            </Badge>
          </motion.div>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-12 w-80 z-50"
          >
            <Card className="shadow-lg border">
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-sm">Bildirişlər</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Yeni bildiriş yoxdur
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`p-3 border-b hover:bg-muted/50 transition-colors cursor-pointer ${
                          !notification.read ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2 flex-1">
                            <div className="mt-0.5">{getIcon(notification.type)}</div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{notification.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notification.timestamp.toLocaleTimeString('az-AZ')}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardNotifications;