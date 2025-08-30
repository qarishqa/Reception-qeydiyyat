import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GripVertical, HelpCircle } from 'lucide-react';

interface FormQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const FormManagement = () => {
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<FormQuestion | null>(null);
  const [draggedItem, setDraggedItem] = useState<FormQuestion | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'text',
    options: '',
    is_required: false,
    is_active: true
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('form_questions')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Xəta",
        description: "Suallar yüklənərkən xəta baş verdi",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.question_text.trim()) {
      toast({
        title: "Xəta",
        description: "Sual mətnini daxil edin",
        variant: "destructive"
      });
      return;
    }

    try {
      const questionData = {
        question_text: formData.question_text,
        question_type: formData.question_type,
        options: formData.question_type === 'select' || formData.question_type === 'radio' 
          ? formData.options.split('\n').filter(opt => opt.trim()) 
          : null,
        is_required: formData.is_required,
        is_active: formData.is_active,
        display_order: editingQuestion ? editingQuestion.display_order : questions.length + 1
      };

      if (editingQuestion) {
        const { error } = await supabase
          .from('form_questions')
          .update(questionData)
          .eq('id', editingQuestion.id);

        if (error) throw error;

        toast({
          title: "Uğur!",
          description: "Sual yeniləndi"
        });
      } else {
        const { error } = await supabase
          .from('form_questions')
          .insert([questionData]);

        if (error) throw error;

        toast({
          title: "Uğur!",
          description: "Yeni sual əlavə edildi"
        });
      }

      resetForm();
      setIsDialogOpen(false);
      fetchQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: "Xəta",
        description: "Sual saxlanılarkən xəta baş verdi",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      question_text: '',
      question_type: 'text',
      options: '',
      is_required: false,
      is_active: true
    });
    setEditingQuestion(null);
  };

  const handleEdit = (question: FormQuestion) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options ? question.options.join('\n') : '',
      is_required: question.is_required,
      is_active: question.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('form_questions')
        .update({ is_active: false })
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: "Uğur!",
        description: "Sual deaktiv edildi"
      });
      
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Xəta",
        description: "Sual silinərkən xəta baş verdi",
        variant: "destructive"
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, question: FormQuestion) => {
    setDraggedItem(question);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetQuestion: FormQuestion) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetQuestion.id) {
      setDraggedItem(null);
      return;
    }

    try {
      // Reorder questions
      const updatedQuestions = [...questions];
      const draggedIndex = updatedQuestions.findIndex(q => q.id === draggedItem.id);
      const targetIndex = updatedQuestions.findIndex(q => q.id === targetQuestion.id);

      // Remove dragged item and insert at new position
      updatedQuestions.splice(draggedIndex, 1);
      updatedQuestions.splice(targetIndex, 0, draggedItem);

      // Update display_order for all affected questions
      const updates = updatedQuestions.map((question, index) => ({
        id: question.id,
        display_order: index + 1
      }));

      // Update in database
      for (const update of updates) {
        const { error } = await supabase
          .from('form_questions')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: "Uğur!",
        description: "Sual sırası dəyişdirildi"
      });

      fetchQuestions();
    } catch (error) {
      console.error('Error reordering questions:', error);
      toast({
        title: "Xəta",
        description: "Sual sırası dəyişdirilərkən xəta baş verdi",
        variant: "destructive"
      });
    } finally {
      setDraggedItem(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const questionTypeLabels: Record<string, string> = {
    text: 'Mətn',
    textarea: 'Uzun mətn',
    number: 'Rəqəm',
    email: 'E-poçt',
    phone: 'Telefon',
    select: 'Seçim siyahısı',
    radio: 'Radio düymələri',
    checkbox: 'Checkbox'
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Form İdarəçiliyi</h2>
          <p className="text-muted-foreground">Müştəri formu suallarını idarə edin</p>
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Form İdarəçiliyi</h2>
          <p className="text-muted-foreground">Müştəri formu suallarını idarə edin</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Yeni Sual
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingQuestion ? 'Sualı Redaktə Et' : 'Yeni Sual Əlavə Et'}
                </DialogTitle>
                <DialogDescription>
                  Müştəri formu üçün sual yaradın və ya mövcud sualı redaktə edin.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="question_text">Sual mətn</Label>
                  <Textarea
                    id="question_text"
                    placeholder="Sualı daxil edin..."
                    value={formData.question_text}
                    onChange={(e) => setFormData({...formData, question_text: e.target.value})}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="question_type">Sual tipi</Label>
                  <Select 
                    value={formData.question_type} 
                    onValueChange={(value) => setFormData({...formData, question_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Mətn</SelectItem>
                      <SelectItem value="textarea">Uzun mətn</SelectItem>
                      <SelectItem value="number">Rəqəm</SelectItem>
                      <SelectItem value="email">E-poçt</SelectItem>
                      <SelectItem value="phone">Telefon</SelectItem>
                      <SelectItem value="select">Seçim siyahısı</SelectItem>
                      <SelectItem value="radio">Radio düymələri</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.question_type === 'select' || formData.question_type === 'radio') && (
                  <div className="grid gap-2">
                    <Label htmlFor="options">Seçim variantları</Label>
                    <Textarea
                      id="options"
                      placeholder="Hər variant ayrı sətirgə yazın..."
                      value={formData.options}
                      onChange={(e) => setFormData({...formData, options: e.target.value})}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_required"
                    checked={formData.is_required}
                    onCheckedChange={(checked) => setFormData({...formData, is_required: checked})}
                  />
                  <Label htmlFor="is_required">Məcburi sual</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label htmlFor="is_active">Aktiv</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  İmtina
                </Button>
                <Button type="submit">
                  {editingQuestion ? 'Yenilə' : 'Əlavə Et'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Form Sualları</CardTitle>
          <CardDescription>
            Cəmi {questions.length} sual - {questions.filter(q => q.is_active).length} aktiv
          </CardDescription>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Hələ sual yoxdur</p>
              <p>Müştəri formu üçün ilk sualı əlavə edin</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div 
                  key={question.id} 
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-all duration-200 ${
                    draggedItem?.id === question.id 
                      ? 'opacity-50 bg-primary/5 border-primary' 
                      : 'bg-secondary/20 hover:bg-secondary/30'
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, question)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, question)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex items-center gap-2 text-muted-foreground cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-5 h-5" />
                    <span className="text-sm font-medium">#{index + 1}</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-foreground mb-1">
                          {question.question_text}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {questionTypeLabels[question.question_type]}
                          </Badge>
                          {question.is_required && (
                            <Badge variant="destructive" className="text-xs">
                              Məcburi
                            </Badge>
                          )}
                          {!question.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Deaktiv
                            </Badge>
                          )}
                        </div>
                        {question.options && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">Variantlar:</p>
                            <div className="flex flex-wrap gap-1">
                              {question.options.slice(0, 3).map((option, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {option}
                                </Badge>
                              ))}
                              {question.options.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{question.options.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(question)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(question.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FormManagement;