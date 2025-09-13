import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Car, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have the required tokens from the URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      setError('Keçərsiz şifrə sıfırlama linki. Yenidən cəhd edin.');
    }
  }, [searchParams]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Şifrələr uyğun gəlmir');
      return;
    }
    
    if (password.length < 6) {
      setError('Şifrə ən azı 6 simvol olmalıdır');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        setError('Şifrə yenilənərkən xəta baş verdi: ' + error.message);
      } else {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    } catch (error: any) {
      setError('Gözlənilməz xəta baş verdi');
    }
    
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Şifrə Yeniləndi</h1>
            <p className="text-muted-foreground mt-2">Şifrəniz uğurla yeniləndi</p>
          </div>

          <Card className="card-elevated">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-semibold">Uğurlu!</CardTitle>
              <CardDescription>
                Şifrəniz uğurla yeniləndi. 3 saniyə sonra giriş səhifəsinə yönləndiriləcəksiniz.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/auth')}
                className="w-full gradient-primary text-primary-foreground font-medium py-3"
              >
                İndi Giriş Et
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-primary">
            <Car className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Performance Center</h1>
          <p className="text-muted-foreground mt-2">Yeni Şifrə Təyin Et</p>
        </div>

        <Card className="card-elevated">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">Yeni Şifrə</CardTitle>
            <CardDescription>
              Hesabınız üçün yeni şifrə təyin edin
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="form-field">
                <Label htmlFor="password" className="form-label">Yeni Şifrə</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ən azı 6 simvol"
                  required
                  minLength={6}
                  className="transition-smooth focus:shadow-primary"
                />
              </div>
              
              <div className="form-field">
                <Label htmlFor="confirmPassword" className="form-label">Şifrəni Təkrarla</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Şifrəni təkrarla"
                  required
                  minLength={6}
                  className="transition-smooth focus:shadow-primary"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground font-medium py-3 transition-smooth hover:shadow-primary"
                disabled={loading}
              >
                <Lock className="w-4 h-4 mr-2" />
                {loading ? 'Yenilənir...' : 'Şifrəni Yenilə'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>© 2024 Performance Center - Avtosalon CRM Sistemi</p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;