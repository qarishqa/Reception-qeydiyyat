import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, UserCog, Mail, Calendar, Shield, Users, Key, Trash2 } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: 'admin' | 'reception';
  username: string;
  created_at: string;
  updated_at: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState<UserProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'reception' as 'admin' | 'reception'
  });

  // Password change form state
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Xəta",
        description: "İstifadəçilər yüklənərkən xəta baş verdi",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.full_name.trim()) {
      toast({
        title: "Xəta",
        description: "Bütün məcburi sahələri doldurun",
        variant: "destructive"
      });
      return;
    }

    if (!editingUser && !formData.password) {
      toast({
        title: "Xəta",
        description: "Şifrə daxil edin",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('profiles')
          .update({ 
            full_name: formData.full_name,
            username: formData.username,
            role: formData.role 
          })
          .eq('id', editingUser.id);

        if (error) throw error;

        toast({
          title: "Uğur!",
          description: "İstifadəçi məlumatları yeniləndi"
        });
      } else {
        // Create new user using edge function with admin privileges
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            username: formData.username,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role
          }
        });

        if (error) {
          console.error('Edge function error:', error);
          throw new Error('İstifadəçi yaradılarkən xəta baş verdi');
        }

        if (data.error) {
          throw new Error(data.error);
        }

        toast({
          title: "Uğur!",
          description: "Yeni istifadəçi yaradıldı və təsdiqləndi"
        });
      }

      resetForm();
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({
        title: "Xəta",
        description: error.message || "İstifadəçi saxlanılarkən xəta baş verdi",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      full_name: '',
      role: 'reception'
    });
    setEditingUser(null);
    setPasswordData({
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      password: '',
      full_name: user.full_name,
      role: user.role
    });
    setIsDialogOpen(true);
  };

  const handlePasswordChange = (user: UserProfile) => {
    setChangingPasswordUser(user);
    setPasswordData({
      newPassword: '',
      confirmPassword: ''
    });
    setIsPasswordDialogOpen(true);
  };

  const handleDelete = async (user: UserProfile) => {
    if (!confirm(`"${user.full_name}" istifadəçisini silmək istədiyinizə əminsiniz? Bu əməliyyat geri alına bilməz.`)) {
      return;
    }

    try {
      // First delete the user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Then delete the auth user using edge function
      const { error: authError } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.user_id }
      });

      if (authError) {
        console.warn('Auth user deletion failed:', authError);
        // Continue anyway as profile is already deleted
      }

      toast({
        title: "Uğur!",
        description: "İstifadəçi silindi"
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Xəta",
        description: error.message || "İstifadəçi silinərkən xəta baş verdi",
        variant: "destructive"
      });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Xəta",
        description: "Şifrələr uyğun gəlmir",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Xəta",
        description: "Şifrə ən azı 6 simvol olmalıdır",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Update user password via Admin Edge Function
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: {
          user_id: changingPasswordUser?.user_id,
          new_password: passwordData.newPassword
        }
      });

      if (error) throw new Error(error.message || 'Edge function xətası');
      if (data.error) throw new Error(data.error);

      toast({
        title: "Uğur!",
        description: "Şifrə uğurla dəyişdirildi"
      });

      setIsPasswordDialogOpen(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setChangingPasswordUser(null);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Xəta",
        description: error.message || "Şifrə dəyişdirilərkən xəta baş verdi",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">İstifadəçi İdarəçiliyi</h2>
          <p className="text-muted-foreground">Sistem istifadəçilərini idarə edin</p>
        </div>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Yüklənir...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">İstifadəçi İdarəçiliyi</h2>
          <p className="text-muted-foreground">Sistem istifadəçilərini idarə edin</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Yeni İstifadəçi
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'İstifadəçini Redaktə Et' : 'Yeni İstifadəçi Əlavə Et'}
                </DialogTitle>
                <DialogDescription>
                  {editingUser 
                    ? 'İstifadəçi məlumatlarını və rolunu dəyişdirin.'
                    : 'Sistemə yeni istifadəçi əlavə edin.'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">İstifadəçi adı *</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="istifadeci_adi"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                </div>

                {!editingUser && (
                  <div className="grid gap-2">
                    <Label htmlFor="password">Şifrə *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Ən azı 6 simvol"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      minLength={6}
                      required
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="full_name">Tam ad *</Label>
                  <Input
                    id="full_name"
                    placeholder="Ad Soyad"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="role">Rol *</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: 'admin' | 'reception') => setFormData({...formData, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reception">Reception</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  İmtina
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Gözləyin...' : editingUser ? 'Yenilə' : 'Yarat'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            İstifadəçilər
          </CardTitle>
          <CardDescription>
            Cəmi {users.length} istifadəçi - {users.filter(u => u.role === 'admin').length} admin, {users.filter(u => u.role === 'reception').length} reception
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCog className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Hələ istifadəçi yoxdur</p>
              <p>Sistemə ilk istifadəçini əlavə edin</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Yaradılma tarixi</TableHead>
                    <TableHead>Əməliyyatlar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground">ID: {user.user_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.role === 'admin' ? "default" : "secondary"}
                          className="flex items-center gap-1 w-fit"
                        >
                          {user.role === 'admin' ? (
                            <Shield className="w-3 h-3" />
                          ) : (
                            <Mail className="w-3 h-3" />
                          )}
                          {user.role === 'admin' ? 'Admin' : 'Reception'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(user.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                            className="flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Redaktə
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePasswordChange(user)}
                            className="flex items-center gap-2"
                          >
                            <Key className="w-4 h-4" />
                            Şifrə Dəyiş
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user)}
                            className="flex items-center gap-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                            Sil
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
        setIsPasswordDialogOpen(open);
        if (!open) {
          setPasswordData({ newPassword: '', confirmPassword: '' });
          setChangingPasswordUser(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handlePasswordSubmit}>
            <DialogHeader>
              <DialogTitle>Şifrə Dəyişdir</DialogTitle>
              <DialogDescription>
                {changingPasswordUser?.full_name} istifadəçisi üçün yeni şifrə təyin edin.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="newPassword">Yeni şifrə *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Ən azı 6 simvol"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  minLength={6}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Şifrəni təkrarla *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Şifrəni təkrarla"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  minLength={6}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                İmtina
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Gözləyin...' : 'Şifrəni Dəyişdir'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;