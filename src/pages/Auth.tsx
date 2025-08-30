import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Car, LogIn } from 'lucide-react';

const Auth = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Convert username to email format
    const email = `${username}@performance-center.az`;
    const { error } = await signIn(email, password);
    if (error) {
      setError('İstifadəçi adı və ya şifrə yanlışdır');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-primary">
            <Car className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Performance Center</h1>
          <p className="text-muted-foreground mt-2">Müştəri Məlumat Analiz Sistemi</p>
        </div>

        <Card className="card-elevated">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">Sistemə Giriş</CardTitle>
            <CardDescription>
              Avtosalon müştəri məlumatları sisteminə xoş gəlmisiniz
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="form-field">
                <Label htmlFor="username" className="form-label">İstifadəçi adı</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="istifadeci_adi"
                  required
                  className="transition-smooth focus:shadow-primary"
                />
              </div>
              <div className="form-field">
                <Label htmlFor="password" className="form-label">Şifrə</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="transition-smooth focus:shadow-primary"
                />
              </div>
              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground font-medium py-3 transition-smooth hover:shadow-primary"
                disabled={loading}
              >
                <LogIn className="w-4 h-4 mr-2" />
                {loading ? 'Giriş edilir...' : 'Sistemə Giriş'}
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

export default Auth;