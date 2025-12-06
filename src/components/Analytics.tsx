import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Car, Target, Calendar, Filter, Download, Share2, Tv } from 'lucide-react';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';
import { checkIsDeletedColumnExists } from '@/lib/supabaseHelpers';


interface AnalyticsData {
  modelStats: Array<{ name: string; value: number }>;
  sourceStats: Array<{ name: string; value: number }>;
  monthlyStats: Array<{ month: string; customers: number; sold: number }>;
  ageGroupStats: Array<{ name: string; value: number }>;
  genderStats: Array<{ name: string; value: number }>;
  salonStats: Array<{ name: string; value: number }>;
  salesManagerStats: Array<{ name: string; value: number }>;
  socialMediaStats: Array<{ name: string; value: number }>;
  tvChannelStats: Array<{ name: string; value: number }>;
}

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    modelStats: [],
    sourceStats: [],
    monthlyStats: [],
    ageGroupStats: [],
    genderStats: [],
    salonStats: [],
    salesManagerStats: [],
    socialMediaStats: [],
    tvChannelStats: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [drillDownData, setDrillDownData] = useState<any[]>([]);
  const [formQuestions, setFormQuestions] = useState<any[]>([]);


  useEffect(() => {
    const loadData = async () => {
      await fetchFormQuestions();
      await fetchAnalyticsData();
    };
    loadData();
  }, [timeRange]);

  const fetchFormQuestions = async (): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from('form_questions')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      const questions = data || [];
      setFormQuestions(questions);
      return questions;
    } catch (error) {
      // Silently fail - not critical for analytics
      console.error('Error fetching form questions:', error);
      return [];
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Ensure form questions are loaded
      let questions = formQuestions;
      if (questions.length === 0) {
        questions = await fetchFormQuestions();
      }
      
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

      const hasIsDeletedColumn = await checkIsDeletedColumnExists();

      // Fetch all customers (excluding deleted ones)
      let query = supabase.from('customers').select('*');
      
      // Apply delete filter based on column existence
      if (hasIsDeletedColumn) {
        query = query.eq('is_deleted', false);
      } else {
        query = query
          .not('full_name', 'like', '[DELETED%')
          .not('age_group', 'eq', '[DELETED]');
      }
      
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

      // Process salon statistics
      const salonCounts = customers.reduce((acc, customer) => {
        if (customer.salon) {
          acc[customer.salon] = (acc[customer.salon] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const salonStats = Object.entries(salonCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Process sales manager statistics
      const salesManagerCounts = customers.reduce((acc, customer) => {
        if (customer.sales_manager) {
          acc[customer.sales_manager] = (acc[customer.sales_manager] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const salesManagerStats = Object.entries(salesManagerCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Process social media breakdown
      // Find social media parent question and its sub-questions
      const socialMediaParentQuestion = questions.find(q => 
        q.question_text?.toLowerCase().includes('reklam') && 
        q.options?.some(opt => {
          const optLower = opt.toLowerCase();
          return optLower.includes('sosial') || optLower.includes('şəbəkə') || optLower.includes('social');
        })
      );

      const socialMediaSubQuestions = socialMediaParentQuestion 
        ? questions.filter(q => 
            q.parent_question_id === socialMediaParentQuestion.id &&
            (q.trigger_value?.toLowerCase().includes('sosial') || 
             q.trigger_value?.toLowerCase().includes('şəbəkə'))
          )
        : [];

      // Get customers where ad_source contains "Sosial şəbəkə" or has social_media_platform
      const socialMediaCustomers = customers.filter(customer => {
        const source = customer.ad_source?.toLowerCase() || '';
        const hasPlatform = customer.social_media_platform && customer.social_media_platform.trim();
        return hasPlatform || 
               source.includes('sosial') || 
               source.includes('şəbəkə') || 
               source.includes('social') || 
               source.includes('sebeke');
      });

      // Process social media platforms - use social_media_platform column if available
      const socialMediaPlatforms: Record<string, number> = {};
      
      // Count customers by platform using social_media_platform column
      socialMediaCustomers.forEach(customer => {
        // First, try to use social_media_platform column (preferred method)
        if (customer.social_media_platform && customer.social_media_platform.trim()) {
          const platform = customer.social_media_platform.trim();
          socialMediaPlatforms[platform] = (socialMediaPlatforms[platform] || 0) + 1;
          return;
        }
        
        // Fallback: try to extract from ad_source or notes (for old data)
        let platformFound = false;
        const searchText = `${customer.ad_source || ''} ${customer.notes || ''}`.toLowerCase();
        
        // Common social media platforms
        const platformKeywords: Record<string, string[]> = {
          'Instagram': ['instagram', 'insta', 'ig'],
          'Facebook': ['facebook', 'fb'],
          'TikTok': ['tiktok', 'tik tok'],
          'YouTube': ['youtube', 'yt'],
          'LinkedIn': ['linkedin', 'linked in'],
          'Twitter/X': ['twitter', 'x.com', 'x '],
          'Telegram': ['telegram', 'tg'],
          'WhatsApp': ['whatsapp', 'wa'],
        };

        // Try keyword matching
        for (const [platform, keywords] of Object.entries(platformKeywords)) {
          if (keywords.some(keyword => searchText.includes(keyword))) {
            socialMediaPlatforms[platform] = (socialMediaPlatforms[platform] || 0) + 1;
            platformFound = true;
            break;
          }
        }

        // If still not found, add to "Digər"
        if (!platformFound) {
          if (!socialMediaPlatforms['Digər']) {
            socialMediaPlatforms['Digər'] = 0;
          }
          socialMediaPlatforms['Digər'] = (socialMediaPlatforms['Digər'] || 0) + 1;
        }
      });

      // Filter out platforms with 0 customers and sort
      const socialMediaStats = Object.entries(socialMediaPlatforms)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Calculate TV channel statistics
      const tvCustomers = customers.filter(c => 
        c.ad_source?.toLowerCase() === 'tv'
      );
      
      const tvChannels: Record<string, number> = {};
      
      tvCustomers.forEach(customer => {
        // Use tv_channel column
        if (customer.tv_channel && customer.tv_channel.trim()) {
          const channel = customer.tv_channel.trim();
          tvChannels[channel] = (tvChannels[channel] || 0) + 1;
        } else {
          // If no channel specified, add to "Digər"
          tvChannels['Digər'] = (tvChannels['Digər'] || 0) + 1;
        }
      });

      // Filter out channels with 0 customers and sort
      const tvChannelStats = Object.entries(tvChannels)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setAnalyticsData({
        modelStats,
        sourceStats,
        monthlyStats,
        ageGroupStats,
        genderStats,
        salonStats,
        salesManagerStats,
        socialMediaStats,
        tvChannelStats
      });
    } catch (error) {
      handleError(error, {
        action: 'fetchAnalyticsData',
        component: 'Analytics',
        metadata: { timeRange },
      });
    } finally {
      setLoading(false);
    }
  };





  const handleChartClick = async (data: any, chartType: string) => {
    if (!data || !data.name) return;
    
    setSelectedChart(chartType);
    toast.success(`${data.name} üçün məlumatlar yüklənir...`);
    
    try {
      // Fetch detailed data based on the clicked item
      let query = supabase.from('customers').select('*');
      
      switch(chartType) {
        case 'model':
          query = query.eq('interested_model', data.name);
          break;
        case 'source':
          query = query.eq('ad_source', data.name);
          break;
        case 'age':
          query = query.eq('age_group', data.name);
          break;
        case 'salon':
          query = query.eq('salon', data.name);
          break;
        case 'sales_manager':
          query = query.eq('sales_manager', data.name);
          break;
        case 'social_media':
          // Filter for social media customers matching the platform
          const platformName = data.name.toLowerCase();
          query = query.or(`ad_source.ilike.%${platformName}%,notes.ilike.%${platformName}%`);
          break;
      }
      
      const { data: customers, error } = await query;
      if (error) throw error;
      
      setDrillDownData(customers || []);
    } catch (error) {
      handleError(error, {
        action: 'fetchDrillDownData',
        component: 'Analytics',
        metadata: { chartType, dataName: data.name },
      });
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
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-foreground mb-2">Analitika və Hesabatlar</h2>
          <p className="text-muted-foreground">Müştəri məlumatlarının təhlili və statistikası</p>
        </motion.div>
        
        <motion.div 
          className="flex gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
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
          
          {selectedChart && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedChart(null);
                setDrillDownData([]);
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtri Təmizlə
            </Button>
          )}
        </motion.div>
      </div>

      {selectedChart && drillDownData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="card-elevated border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Seçilmiş Məlumatlar
                <Badge className="ml-2">{drillDownData.length} müştəri</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {drillDownData.slice(0, 8).map((customer, index) => (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 bg-muted/50 rounded-lg"
                  >
                    <p className="font-medium truncate">{customer.full_name}</p>
                    <p className="text-muted-foreground text-xs">{customer.phone}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(customer.created_at).toLocaleDateString('az-AZ')}
                    </p>
                  </motion.div>
                ))}
              </div>
              {drillDownData.length > 8 && (
                <p className="text-center text-muted-foreground text-sm mt-4">
                  ... və daha {drillDownData.length - 8} müştəri
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}





      {/* Model Interest */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="card-elevated hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Ən Çox Maraqlanılan Modellər
                <Badge variant="outline" className="ml-auto">Klikləyin</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.modelStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#1e40af" 
                    onClick={(data) => handleChartClick(data, 'model')}
                    className="cursor-pointer hover:opacity-80"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="card-elevated hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Reklam Mənbələri
                <Badge variant="outline" className="ml-auto">Klikləyin</Badge>
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
                    onClick={(data) => handleChartClick(data, 'source')}
                    className="cursor-pointer"
                  >
                    {analyticsData.sourceStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analyticsData.genderStats}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
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

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Salon Statistikası
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.salonStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  fill="#8884d8" 
                  onClick={(data) => handleChartClick(data, 'salon')}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Satış Meneceri Statistikası
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.salesManagerStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  fill="#82ca9d" 
                  onClick={(data) => handleChartClick(data, 'sales_manager')}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Social Media Breakdown - Only show if there are social media customers */}
      {analyticsData.socialMediaStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="card-elevated hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Sosial Media Platformaları
                <Badge variant="outline" className="ml-auto">
                  {analyticsData.socialMediaStats.reduce((sum, stat) => sum + stat.value, 0)} müştəri
                </Badge>
              </CardTitle>
              <CardDescription>
                Sosial media mənbələrindən gələn müştərilərin platforma üzrə bölgüsü
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analyticsData.socialMediaStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#8b5cf6"
                    onClick={(data) => handleChartClick(data, 'social_media')}
                    className="cursor-pointer hover:opacity-80"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              
              {/* Summary stats */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {analyticsData.socialMediaStats.slice(0, 4).map((stat) => (
                  <div key={stat.name} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{stat.name}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {((stat.value / analyticsData.socialMediaStats.reduce((sum, s) => sum + s.value, 0)) * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* TV Channel Breakdown - Only show if there are TV customers */}
      {analyticsData.tvChannelStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="card-elevated hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tv className="w-5 h-5 text-primary" />
                TV Kanalları
                <Badge variant="outline" className="ml-auto">
                  {analyticsData.tvChannelStats.reduce((sum, stat) => sum + stat.value, 0)} müştəri
                </Badge>
              </CardTitle>
              <CardDescription>
                TV reklamından gələn müştərilərin kanal üzrə bölgüsü
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analyticsData.tvChannelStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value} müştəri`, 'Say']}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                  >
                    {analyticsData.tvChannelStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              
              {/* Summary stats */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {analyticsData.tvChannelStats.slice(0, 4).map((stat) => (
                  <div key={stat.name} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{stat.name}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {((stat.value / analyticsData.tvChannelStats.reduce((sum, s) => sum + s.value, 0)) * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Analytics;