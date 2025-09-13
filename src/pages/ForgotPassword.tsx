import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Car, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Convert username to email format if needed
    const emailToUse = email.includes('@') 
      ? email 
      : `${email.toLowerCase()}@performance-center.az`;

    const { error } = await resetPassword(emailToUse);
    
    if (error) {
      if (error.message?.includes('User not found')) {
        setError('Bu e-poçt ünvanı ilə istifadəçi tapılmadı');
      } else {
        setError('Şifrə sıfırlama e-poçtu göndərilərkən xəta baş verdi');
      }
    } else {
      setSuccess(true);
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
            <h1 className="text-3xl font-bold text-foreground">E-poçt Göndərildi</h1>
            <p className="text-muted-foreground mt-2">Şifrə sıfırlama təlimatları göndərildi</p>
          </div>

          <Card className="card-elevated">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-semibold">E-poçtunuzu yoxlayın</CardTitle>
              <CardDescription>
                {email} ünvanına şifrə sıfırlama linki göndərildi. E-poçtunuzu yoxlayın və təlimatları izləyin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={() => navigate('/auth')}
                  className="w-full gradient-primary text-primary-foreground font-medium py-3"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Giriş səhifəsinə qayıt
                </Button>
                
                <Button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Yenidən göndər
                </Button>
              </div>
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
          <p className="text-muted-foreground mt-2">Şifrəni Sıfırla</p>
        </div>

        <Card className="card-elevated">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">Şifrəni Unutmusan?</CardTitle>
            <CardDescription>
              E-poçt ünvanınızı daxil edin və şifrə sıfırlama linki göndərəcəyik
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="form-field">
                <Label htmlFor="email" className="form-label">E-poçt və ya İstifadəçi adı</Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="istifadeci_adi və ya email@example.com"
                  required
                  className="transition-smooth focus:shadow-primary"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground font-medium py-3 transition-smooth hover:shadow-primary"
                disabled={loading}
              >
                <Mail className="w-4 h-4 mr-2" />
                {loading ? 'Göndərilir...' : 'Şifrə Sıfırlama Linki Göndər'}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <Link 
                to="/auth" 
                className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Giriş səhifəsinə qayıt
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>© 2024 Performance Center - Avtosalon CRM Sistemi</p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;