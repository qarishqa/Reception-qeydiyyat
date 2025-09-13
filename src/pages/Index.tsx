import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Car, Users, BarChart3, LogIn } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mx-auto w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mb-8 shadow-primary">
            <Car className="w-10 h-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Performance <span className="text-primary">Center</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
            Avtosalon müştəri məlumatlarının toplanması və analiz edilməsi üçün<br />
            professional CRM sistemi
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="card-elevated p-6">
              <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Müştəri İdarəçiliyi</h3>
              <p className="text-muted-foreground text-sm">
                Telefon avtomatik axtarışı və məlumat yeniləməsi
              </p>
            </div>
            
            <div className="card-elevated p-6">
              <BarChart3 className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analitika</h3>
              <p className="text-muted-foreground text-sm">
                Detallı hesabatlar və trend analizi
              </p>
            </div>
            
            <div className="card-elevated p-6">
              <Car className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Avtosalon CRM</h3>
              <p className="text-muted-foreground text-sm">
                Model, reklam mənbəyi və satış statistikası
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={() => navigate('/auth')}
              className="gradient-primary text-primary-foreground px-8 py-4 text-lg font-medium transition-smooth hover:shadow-primary"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Sistemə Giriş
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
