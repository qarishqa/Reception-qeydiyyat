import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Car, Target, Calendar } from 'lucide-react';

interface AnalyticsData {
  modelStats: Array<{ name: string; value: number }>;
  sourceStats: Array<{ name: string; value: number }>;
  statusStats: Array<{ name: string; value: number }>;
  monthlyStats: Array<{ month: string; customers: number; sold: number }>;
  ageGroupStats: Array<{ name: string; value: number }>;
  genderStats: Array<{ name: string; value: number }>;
}

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    modelStats: [],
    sourceStats: [],
    statusStats: [],
    monthlyStats: [],
    ageGroupStats: [],
    genderStats: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Build date filter
      let dateFilter = '';
      if (timeRange !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (timeRange) {
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        dateFilter = startDate.toISOString();
      }

      // Fetch all customers
      let query = supabase.from('customers').select('*');
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }
      
      const { data: customers, error } = await query;
      if (error) throw error;

      if (!customers) {
        setLoading(false);
        return;
      }

      // Process model statistics
      const modelCounts = customers.reduce((acc, customer) => {
        if (customer.interested_model) {
          acc[customer.interested_model] = (acc[customer.interested_model] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const modelStats = Object.entries(modelCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Process source statistics
      const sourceCounts = customers.reduce((acc, customer) => {
        if (customer.ad_source) {
          acc[customer.ad_source] = (acc[customer.ad_source] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const sourceStats = Object.entries(sourceCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Process status statistics
      const statusCounts = customers.reduce((acc, customer) => {
        const statusNames = {
          'new_inquiry': 'Yeni Sorğu',
          'test_drive_scheduled': 'Test Sürüşü',
          'negotiating': 'Danışıqlar',
          'sold': 'Satıldı',
          'lost': 'İtkin'
        };
        const statusName = statusNames[customer.status as keyof typeof statusNames] || customer.status;
        acc[statusName] = (acc[statusName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const statusStats = Object.entries(statusCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Process age group statistics
      const ageCounts = customers.reduce((acc, customer) => {
        if (customer.age_group) {
          acc[customer.age_group] = (acc[customer.age_group] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const ageGroupStats = Object.entries(ageCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Process gender statistics
      const genderCounts = customers.reduce((acc, customer) => {
        if (customer.gender) {
          acc[customer.gender] = (acc[customer.gender] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const genderStats = Object.entries(genderCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Process monthly statistics (last 6 months)
      const monthlyData: Record<string, { customers: number; sold: number }> = {};
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('az-AZ', { year: 'numeric', month: 'short' });
        monthlyData[monthKey] = { customers: 0, sold: 0 };
        months.push(monthKey);
      }

      customers.forEach(customer => {
        const createdDate = new Date(customer.created_at);
        const monthKey = createdDate.toLocaleDateString('az-AZ', { year: 'numeric', month: 'short' });
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].customers++;
          if (customer.status === 'sold') {
            monthlyData[monthKey].sold++;
          }
        }
      });

      const monthlyStats = months.map(month => ({
        month,
        customers: monthlyData[month].customers,
        sold: monthlyData[month].sold
      }));

      setAnalyticsData({
        modelStats,
        sourceStats,
        statusStats,
        monthlyStats,
        ageGroupStats,
        genderStats
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#c3dafe', '#dbeafe'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Analitika məlumatları yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Analitika və Hesabatlar</h2>
          <p className="text-muted-foreground">Müştəri məlumatlarının təhlili və statistikası</p>
        </div>
        
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Vaxt aralığı" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün Vaxtlar</SelectItem>
            <SelectItem value="week">Son Həftə</SelectItem>
            <SelectItem value="month">Son Ay</SelectItem>
            <SelectItem value="quarter">Son 3 Ay</SelectItem>
            <SelectItem value="year">Son İl</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Monthly Trend */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Aylıq Trend
          </CardTitle>
          <CardDescription>Son 6 ayda müştəri və satış trendi</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="customers" stroke="#1e40af" strokeWidth={2} name="Müştərilər" />
              <Line type="monotone" dataKey="sold" stroke="#16a34a" strokeWidth={2} name="Satışlar" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Model Interest */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              Ən Çox Maraqlanılan Modellər
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.modelStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#1e40af" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Reklam Mənbələri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.sourceStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.sourceStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status and Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Müştəri Statusları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analyticsData.statusStats}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {analyticsData.statusStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {analyticsData.statusStats.map((stat, index) => (
                <div key={stat.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{stat.name}</span>
                  </div>
                  <span className="font-medium">{stat.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Yaş Qrupları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.ageGroupStats.map((stat, index) => (
                <div key={stat.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{stat.name}</span>
                    <span className="font-medium">{stat.value}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(stat.value / Math.max(...analyticsData.ageGroupStats.map(s => s.value))) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Cins Tərkibi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analyticsData.genderStats}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analyticsData.genderStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;