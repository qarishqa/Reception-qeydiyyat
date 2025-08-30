import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Car, 
  TrendingUp, 
  Calendar,
  Plus,
  LogOut,
  Settings,
  BarChart3,
  Phone,
  Mail,
  HelpCircle,
  UserCog
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CustomerForm from '@/components/CustomerForm';
import CustomerList from '@/components/CustomerList';
import Analytics from '@/components/Analytics';
import FormManagement from '@/components/FormManagement';
import UserManagement from '@/components/UserManagement';

interface DashboardStats {
  totalCustomers: number;
  todayCustomers: number;
  monthlyCustomers: number;
}

const Dashboard = () => {
  const { profile, signOut, isAdmin, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    todayCustomers: 0,
    monthlyCustomers: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  // Authentication guard - redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchStats = async () => {
    try {
      // Total customers
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Today's customers
      const today = new Date().toISOString().split('T')[0];
      const { count: todayCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      // Monthly customers
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count: monthlyCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth);

      setStats({
        totalCustomers: totalCustomers || 0,
        todayCustomers: todayCustomers || 0,
        monthlyCustomers: monthlyCustomers || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Çıxış zamanı xəta:', error);
    }
  };

  // Show loading while checking authentication or fetching stats
  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Yüklənir...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render dashboard (will redirect in useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5">
      {/* Header */}
      <header className="bg-card border-b shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Performance Center</h1>
                <p className="text-sm text-muted-foreground">Müştəri Analiz Sistemi</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
                    {isAdmin ? 'Admin' : 'Reception'}
                  </Badge>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground transition-smooth"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-smooth ${
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Ümumi Baxış
              </div>
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-smooth ${
                activeTab === 'customers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Müştərilər
              </div>
            </button>
            <button
              onClick={() => setActiveTab('add-customer')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-smooth ${
                activeTab === 'add-customer'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Müştəri Əlavə Et
              </div>
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-smooth ${
                    activeTab === 'analytics'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Analitika
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('form-management')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-smooth ${
                    activeTab === 'form-management'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Form İdarəçiliyi
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('user-management')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-smooth ${
                    activeTab === 'user-management'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserCog className="w-4 h-4" />
                    İstifadəçilər
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Ümumi Baxış</h2>
              <p className="text-muted-foreground">Sistem statistikalarına baxış</p>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="card-elevated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ümumi Müştəri
                  </CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.totalCustomers}</div>
                  <p className="text-xs text-muted-foreground">Bütün müştərilər</p>
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Bugünkü Müştərilər
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.todayCustomers}</div>
                  <p className="text-xs text-muted-foreground">Bu gün əlavə edilib</p>
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Aylıq Müştərilər
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.monthlyCustomers}</div>
                  <p className="text-xs text-muted-foreground">Bu ay əlavə edilib</p>
                </CardContent>
              </Card>

            </div>
          </div>
        )}

        {activeTab === 'customers' && <CustomerList onStatsUpdate={fetchStats} />}
        {activeTab === 'add-customer' && <CustomerForm onSuccess={fetchStats} />}
        {activeTab === 'analytics' && isAdmin && <Analytics />}
        {activeTab === 'form-management' && isAdmin && <FormManagement />}
        {activeTab === 'user-management' && isAdmin && <UserManagement />}
      </main>
    </div>
  );
};

export default Dashboard;