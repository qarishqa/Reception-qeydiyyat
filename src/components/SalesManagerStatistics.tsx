import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { UserCheck, Users } from 'lucide-react';

interface SalesManagerStats {
  sales_manager: string;
  customer_count: number;
}

interface SalesManagerStatisticsProps {
  selectedMonth: string;
}

const SalesManagerStatistics: React.FC<SalesManagerStatisticsProps> = ({ selectedMonth }) => {
  const [salesManagerStats, setSalesManagerStats] = useState<SalesManagerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesManagerStatistics();
  }, [selectedMonth]);

  const fetchSalesManagerStatistics = async () => {
    try {
      setLoading(true);
      
      const startDate = new Date(selectedMonth + '-01');
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      
      // For now, we'll use created_by as sales manager until the migration is applied
      const { data, error } = await supabase
        .from('customers')
        .select(`
          created_by,
          profiles!customers_created_by_fkey(full_name)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        console.error('Satış meneceri statistikası yüklənərkən xəta:', error);
        return;
      }

      // Group by sales manager and count
      const managerCounts = data.reduce((acc: Record<string, number>, customer) => {
        const manager = (customer.profiles as any)?.full_name || 'Məlum deyil';
        acc[manager] = (acc[manager] || 0) + 1;
        return acc;
      }, {});

      const stats = Object.entries(managerCounts).map(([sales_manager, count]) => ({
        sales_manager,
        customer_count: count
      }));

      // Sort by customer count descending
      stats.sort((a, b) => b.customer_count - a.customer_count);
      
      setSalesManagerStats(stats);
    } catch (error) {
      console.error('Satış meneceri statistikası yüklənərkən xəta:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCustomers = salesManagerStats.reduce((sum, stat) => sum + stat.customer_count, 0);

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-primary" />
          Satış Meneceri Statistikası
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {salesManagerStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Seçilmiş ay üçün satış meneceri məlumatı tapılmadı
              </p>
            ) : (
              <>
                <div className="text-sm text-muted-foreground mb-4">
                  Ümumi müştəri sayı: <span className="font-semibold text-foreground">{totalCustomers}</span>
                </div>
                <div className="space-y-3">
                  {salesManagerStats.map((stat, index) => {
                    const percentage = totalCustomers > 0 ? (stat.customer_count / totalCustomers * 100) : 0;
                    return (
                      <div key={stat.sales_manager} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{stat.sales_manager}</p>
                            <p className="text-sm text-muted-foreground">
                              {percentage.toFixed(1)}% ümumi müştərilərdən
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-lg text-foreground">
                            {stat.customer_count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesManagerStatistics;