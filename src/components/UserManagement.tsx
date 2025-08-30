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
import { Plus, Edit, UserCog, Mail, Calendar, Shield, Users } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: 'admin' | 'reception';
  created_at: string;
  updated_at: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'reception' as 'admin' | 'reception'
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
    
    if (!formData.email.trim() || !formData.full_name.trim()) {
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
        // Update existing user role
        const { error } = await supabase
          .from('profiles')
          .update({ 
            full_name: formData.full_name,
            role: formData.role 
          })
          .eq('id', editingUser.id);

        if (error) throw error;

        toast({
          title: "Uğur!",
          description: "İstifadəçi məlumatları yeniləndi"
        });
      } else {
        // Create new user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name,
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          // Update the profile with the selected role (default is reception from trigger)
          if (formData.role === 'admin') {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ role: 'admin' })
              .eq('user_id', authData.user.id);

            if (updateError) {
              console.error('Error updating role:', updateError);
            }
          }

          toast({
            title: "Uğur!",
            description: "Yeni istifadəçi yaradıldı"
          });
        }
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
      email: '',
      password: '',
      full_name: '',
      role: 'reception'
    });
    setEditingUser(null);
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: '', // We don't show email in edit mode
      password: '',
      full_name: user.full_name,
      role: user.role
    });
    setIsDialogOpen(true);
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
                {!editingUser && (
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-poçt ünvanı *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="istifadeci@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                )}

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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          className="flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Redaktə
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;