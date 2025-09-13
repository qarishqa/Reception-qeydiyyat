import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Users } from 'lucide-react';

interface SalonStats {
  salon: string;
  customer_count: number;
}

interface SalonStatisticsProps {
  selectedMonth: string;
}

const SalonStatistics: React.FC<SalonStatisticsProps> = ({ selectedMonth }) => {
  const [salonStats, setSalonStats] = useState<SalonStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalonStatistics();
  }, [selectedMonth]);

  const fetchSalonStatistics = async () => {
    try {
      setLoading(true);
      
      const startDate = new Date(selectedMonth + '-01');
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('customers')
        .select('salon')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('salon', 'is', null)
        .not('salon', 'eq', '');

      if (error) {
        console.error('Salon statistikası yüklənərkən xəta:', error);
        return;
      }

      // Group by salon and count
      const salonCounts = data.reduce((acc: Record<string, number>, customer) => {
        const salon = customer.salon || 'Məlum deyil';
        acc[salon] = (acc[salon] || 0) + 1;
        return acc;
      }, {});

      const stats = Object.entries(salonCounts).map(([salon, count]) => ({
        salon,
        customer_count: count
      }));

      // Sort by customer count descending
      stats.sort((a, b) => b.customer_count - a.customer_count);
      
      setSalonStats(stats);
    } catch (error) {
      console.error('Salon statistikası yüklənərkən xəta:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCustomers = salonStats.reduce((sum, stat) => sum + stat.customer_count, 0);

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Salon Statistikası
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {salonStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Seçilmiş ay üçün salon məlumatı tapılmadı
              </p>
            ) : (
              <>
                <div className="text-sm text-muted-foreground mb-4">
                  Ümumi müştəri sayı: <span className="font-semibold text-foreground">{totalCustomers}</span>
                </div>
                <div className="space-y-3">
                  {salonStats.map((stat, index) => {
                    const percentage = totalCustomers > 0 ? (stat.customer_count / totalCustomers * 100) : 0;
                    return (
                      <div key={stat.salon} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{stat.salon}</p>
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

export default SalonStatistics;