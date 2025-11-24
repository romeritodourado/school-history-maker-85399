import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, School, Trash2, Edit, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { schoolSchema } from '@/lib/validationSchemas';

interface SchoolData {
  id: string;
  name: string;
  inep: string | null;
  municipality_id: string | null;
  municipality_name?: string;
}

interface Municipality {
  id: string;
  name: string;
}

export default function Schools() {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    inep: '',
    municipality_id: '',
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { role: currentUserRole, profile: currentUserProfile } = useAuth();

  useEffect(() => {
    fetchData();
  }, [currentUserRole, currentUserProfile]);

  const fetchData = async () => {
    setLoading(true);
    await fetchMunicipalities();
    await fetchSchools();
    setLoading(false);
  };

  const fetchMunicipalities = async () => {
    try {
      let query = supabase
        .from('municipalities')
        .select('id, name')
        .order('name');

      if (currentUserRole === 'municipal_admin' && currentUserProfile?.municipality_id) {
        query = query.eq('id', currentUserProfile.municipality_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMunicipalities(data || []);
      if (data && data.length > 0 && currentUserRole === 'municipal_admin' && currentUserProfile?.municipality_id) {
        setFormData(prev => ({ ...prev, municipality_id: data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching municipalities:', error);
    }
  };

  const fetchSchools = async () => {
    try {
      let query = supabase
        .from('schools')
        .select(`
          id,
          name,
          inep,
          municipality_id,
          municipalities (name)
        `)
        .order('name');

      if (currentUserRole === 'municipal_admin' && currentUserProfile?.municipality_id) {
        query = query.eq('municipality_id', currentUserProfile.municipality_id);
      } else if (currentUserRole === 'school_admin' && currentUserProfile?.school_id) {
        query = query.eq('id', currentUserProfile.school_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const schoolsWithMunicipalityName = (data || []).map(school => ({
        ...school,
        municipality_name: (school.municipalities as { name: string } | null)?.name,
      }));
      setSchools(schoolsWithMunicipalityName as SchoolData[]);
    } catch (error) {
      toast({
        title: 'Erro ao carregar escolas',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      schoolSchema.parse({ name: formData.name, inep_code: formData.inep }); // Use inep_code for validation

      if (!formData.municipality_id) {
        toast({
          title: 'Erro de validação',
          description: 'Selecione uma rede municipal.',
          variant: 'destructive',
        });
        return;
      }

      if (editingSchool) {
        const { error } = await supabase
          .from('schools')
          .update({ name: formData.name, inep: formData.inep, municipality_id: formData.municipality_id })
          .eq('id', editingSchool.id);

        if (error) throw error;
        toast({ title: 'Escola atualizada com sucesso!' });
      } else {
        const { error } = await supabase
          .from('schools')
          .insert([{ name: formData.name, inep: formData.inep, municipality_id: formData.municipality_id }]);

        if (error) throw error;
        toast({ title: 'Escola criada com sucesso!' });
      }

      setDialogOpen(false);
      setEditingSchool(null);
      resetForm();
      fetchSchools();
    } catch (error) {
      toast({
        title: 'Erro ao salvar escola',
        description: error instanceof z.ZodError ? error.errors[0].message : error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta escola? Esta ação é irreversível e removerá todos os alunos e históricos associados.')) return;

    try {
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Escola excluída com sucesso!' });
      fetchSchools();
    } catch (error) {
      toast({
        title: 'Erro ao excluir escola',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (school: SchoolData) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      inep: school.inep || '',
      municipality_id: school.municipality_id || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      inep: '',
      municipality_id: currentUserRole === 'municipal_admin' && currentUserProfile?.municipality_id ? currentUserProfile.municipality_id : '',
    });
    setEditingSchool(null);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <School className="h-8 w-8" />
              Gerenciar Escolas
            </h1>
          </div>
          
          {(currentUserRole === 'super_admin' || currentUserRole === 'municipal_admin') && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Escola
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingSchool ? 'Editar Escola' : 'Nova Escola'}
                  </DialogTitle>
                  <DialogDescription>
                    Preencha os dados da escola
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome da Escola *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="inep">Código INEP</Label>
                    <Input
                      id="inep"
                      value={formData.inep}
                      onChange={(e) => setFormData({ ...formData, inep: e.target.value })}
                      placeholder="Ex: 00000000"
                      maxLength={8}
                    />
                  </div>
                  <div>
                    <Label htmlFor="municipality_id">Rede Municipal *</Label>
                    <Select
                      value={formData.municipality_id}
                      onValueChange={(value) => setFormData({ ...formData, municipality_id: value })}
                      disabled={currentUserRole === 'municipal_admin'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a rede municipal" />
                      </SelectTrigger>
                      <SelectContent>
                        {municipalities.map((municipality) => (
                          <SelectItem key={municipality.id} value={municipality.id}>
                            {municipality.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingSchool ? 'Atualizar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((school) => (
            <Card key={school.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{school.name}</span>
                  {(currentUserRole === 'super_admin' || (currentUserRole === 'municipal_admin' && school.municipality_id === currentUserProfile?.municipality_id)) && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(school)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(school.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {school.inep && (
                    <p className="text-muted-foreground">
                      INEP: {school.inep}
                    </p>
                  )}
                  {school.municipality_name && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Rede: {school.municipality_name}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}