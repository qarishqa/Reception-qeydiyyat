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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FormQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  parent_question_id: string | null;
  trigger_value: string | null;
  condition_type: string | null;
}

// Sortable Question Component
const SortableQuestionItem = ({ 
  question, 
  index, 
  questionTypeLabels, 
  onEdit, 
  onDelete,
  onCreateSubQuestion 
}: {
  question: FormQuestion;
  index: number;
  questionTypeLabels: Record<string, string>;
  onEdit: (question: FormQuestion) => void;
  onDelete: (id: string) => void;
  onCreateSubQuestion: (parentId: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSubQuestion = question.parent_question_id !== null;
  const canHaveSubQuestions = ['select', 'radio', 'checkbox'].includes(question.question_type) && question.options && question.options.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 border rounded-lg transition-all duration-200 ${
        isDragging 
          ? 'opacity-60 bg-primary/5 border-primary shadow-lg scale-105' 
          : 'bg-secondary/20 hover:bg-secondary/30'
      } ${isSubQuestion ? 'ml-8 border-l-4 border-l-primary/40' : ''}`}
    >
      <div 
        className="flex items-center gap-2 text-muted-foreground cursor-grab active:cursor-grabbing hover:text-primary transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
        <span className="text-sm font-medium">#{index + 1}</span>
      </div>
      
      <div className="flex-1">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            {isSubQuestion && (
              <div className="text-xs text-muted-foreground mb-1">
                <Badge variant="outline" className="text-xs">Sub-sual</Badge>
                {question.trigger_value && (
                  <span className="ml-2">Şərt: "{question.trigger_value}"</span>
                )}
              </div>
            )}
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
            {canHaveSubQuestions && !isSubQuestion && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCreateSubQuestion(question.id)}
                className="text-primary hover:text-primary"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(question)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(question.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FormManagement = () => {
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<FormQuestion | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'text',
    options: '',
    is_required: false,
    is_active: true,
    parent_question_id: null as string | null,
    trigger_value: ''
  });

  // Modern drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        options: formData.question_type === 'select' || formData.question_type === 'radio' || formData.question_type === 'checkbox' 
          ? formData.options.split('\n').filter(opt => opt.trim()) 
          : null,
        is_required: formData.is_required,
        is_active: formData.is_active,
        parent_question_id: formData.parent_question_id,
        trigger_value: formData.trigger_value || null,
        condition_type: 'equals',
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
      is_active: true,
      parent_question_id: null,
      trigger_value: ''
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
      is_active: question.is_active,
      parent_question_id: question.parent_question_id,
      trigger_value: question.trigger_value || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('form_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: "Uğur!",
        description: "Sual silindi"
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

  const handleCreateSubQuestion = (parentId: string) => {
    setFormData({
      question_text: '',
      question_type: 'text',
      options: '',
      is_required: false,
      is_active: true,
      parent_question_id: parentId,
      trigger_value: ''
    });
    setEditingQuestion(null);
    setIsDialogOpen(true);
  };

  // Modern drag end handler with optimistic updates
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = questions.findIndex((item) => item.id === active.id);
      const newIndex = questions.findIndex((item) => item.id === over?.id);

      // Optimistic update - change UI immediately
      const newQuestions = arrayMove(questions, oldIndex, newIndex);
      setQuestions(newQuestions);

      try {
        // Update display_order for all affected questions
        const updates = newQuestions.map((question, index) => ({
          id: question.id,
          display_order: index + 1
        }));

        // Batch update in database
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
      } catch (error) {
        console.error('Error reordering questions:', error);
        // Revert on error
        fetchQuestions();
        toast({
          title: "Xəta",
          description: "Sual sırası dəyişdirilərkən xəta baş verdi",
          variant: "destructive"
        });
      }
    }
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
                {formData.parent_question_id && (
                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">Sub-sual</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Bu sual yalnız əsas sualın cavabına əsasən göstəriləcək
                    </p>
                  </div>
                )}

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

                {(formData.question_type === 'select' || formData.question_type === 'radio' || formData.question_type === 'checkbox') && (
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

                {formData.parent_question_id && (
                  <div className="grid gap-2">
                    <Label htmlFor="trigger_value">Şərt dəyəri</Label>
                    <Input
                      id="trigger_value"
                      placeholder="Hansı cavab bu sualı göstərəcək..."
                      value={formData.trigger_value}
                      onChange={(e) => setFormData({...formData, trigger_value: e.target.value})}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Əsas sualın bu cavabı seçildikdə sub-sual görünəcək
                    </p>
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map(q => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <SortableQuestionItem
                      key={question.id}
                      question={question}
                      index={index}
                      questionTypeLabels={questionTypeLabels}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onCreateSubQuestion={handleCreateSubQuestion}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FormManagement;