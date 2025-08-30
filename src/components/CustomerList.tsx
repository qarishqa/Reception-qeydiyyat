import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, 
  Download, 
  Filter, 
  Phone, 
  Mail, 
  Calendar,
  User,
  Car,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  id: string;
  phone: string;
  full_name: string;
  email: string;
  age_group: string;
  gender: string;
  interested_model: string;
  ad_source: string;
  status: string;
  notes: string;
  created_at: string;
  profiles?: {
    full_name: string;
  } | null;
}

interface CustomerListProps {
  onStatsUpdate: () => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ onStatsUpdate }) => {
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, statusFilter, modelFilter, sourceFilter]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          profiles:created_by(full_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCustomers(data as any || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Müştəri məlumatları yüklənə bilmədi');
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(customer => customer.status === statusFilter);
    }

    // Model filter
    if (modelFilter !== 'all') {
      filtered = filtered.filter(customer => customer.interested_model === modelFilter);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(customer => customer.ad_source === sourceFilter);
    }

    setFilteredCustomers(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'new_inquiry': { label: 'Yeni Sorğu', variant: 'default' as const },
      'test_drive_scheduled': { label: 'Test Sürüşü', variant: 'secondary' as const },
      'negotiating': { label: 'Danışıqlar', variant: 'outline' as const },
      'sold': { label: 'Satıldı', variant: 'default' as const },
      'lost': { label: 'İtkin', variant: 'destructive' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap];
    return (
      <Badge variant={statusInfo?.variant || 'default'}>
        {statusInfo?.label || status}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const headers = [
      'Ad və Soyad',
      'Telefon',
      'Email',
      'Yaş Qrupu',
      'Cins',
      'Model',
      'Reklam Mənbəyi',
      'Status',
      'Qeydlər',
      'Əlavə Etdi',
      'Tarix'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredCustomers.map(customer => [
        `"${customer.full_name}"`,
        customer.phone,
        `"${customer.email || ''}"`,
        `"${customer.age_group || ''}"`,
        `"${customer.gender || ''}"`,
        `"${customer.interested_model || ''}"`,
        `"${customer.ad_source || ''}"`,
        `"${customer.status}"`,
        `"${customer.notes || ''}"`,
        `"${customer.profiles?.full_name || ''}"`,
        new Date(customer.created_at).toLocaleDateString('az-AZ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `musterilar-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Məlumatlar CSV faylına export edildi');
  };

  const getUniqueValues = (field: keyof Customer) => {
    return [...new Set(customers.map(customer => customer[field]).filter(Boolean))];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Müştərilər yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Müştəri Siyahısı</h2>
          <p className="text-muted-foreground">
            Ümumi {customers.length} müştəri, göstərilir {filteredCustomers.length}
          </p>
        </div>
        
        {isAdmin && (
          <Button 
            onClick={exportToCSV}
            className="gradient-primary text-primary-foreground transition-smooth hover:shadow-primary"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel Export
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filterlər
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Ad, telefon və ya email axtar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 transition-smooth focus:shadow-primary"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün Statuslar</SelectItem>
                <SelectItem value="new_inquiry">Yeni Sorğu</SelectItem>
                <SelectItem value="test_drive_scheduled">Test Sürüşü</SelectItem>
                <SelectItem value="negotiating">Danışıqlar</SelectItem>
                <SelectItem value="sold">Satıldı</SelectItem>
                <SelectItem value="lost">İtkin</SelectItem>
              </SelectContent>
            </Select>

            {/* Model Filter */}
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün Modellər</SelectItem>
                {getUniqueValues('interested_model').map((model) => (
                  <SelectItem key={String(model)} value={String(model)}>
                    {String(model)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Source Filter */}
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Reklam Mənbəyi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün Mənbələr</SelectItem>
                {getUniqueValues('ad_source').map((source) => (
                  <SelectItem key={String(source)} value={String(source)}>
                    {String(source)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customer Table */}
      <Card className="card-elevated">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Müştəri</TableHead>
                  <TableHead className="font-semibold">Əlaqə</TableHead>
                  <TableHead className="font-semibold">Detallar</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Əlavə Etdi</TableHead>
                  <TableHead className="font-semibold">Tarix</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-muted/50 transition-smooth">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{customer.full_name}</div>
                        {customer.notes && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {customer.notes}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {customer.phone}
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {customer.age_group && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            {customer.age_group} • {customer.gender}
                          </div>
                        )}
                        {customer.interested_model && (
                          <div className="flex items-center gap-1">
                            <Car className="w-3 h-3 text-muted-foreground" />
                            {customer.interested_model}
                          </div>
                        )}
                        {customer.ad_source && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-muted-foreground" />
                            {customer.ad_source}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(customer.status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.profiles?.full_name || 'Bilinmir'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(customer.created_at).toLocaleDateString('az-AZ')}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Müştəri tapılmadı</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || modelFilter !== 'all' || sourceFilter !== 'all'
                  ? 'Filterlərinizi dəyişdirməyi yoxlayın'
                  : 'Hələ heç bir müştəri əlavə edilməyib'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerList;