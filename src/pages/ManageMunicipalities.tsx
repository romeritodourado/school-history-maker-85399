import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Trash2, Edit, ArrowLeft, UploadCloud } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from '@/components/ui/progress';
import { z } from 'zod';
import { municipalitySchema } from '@/lib/validationSchemas';
import correctLogo from "/correct-logo.png";

interface Municipality {
  id: string;
  name: string;
  cnpj: string | null;
  emblem_url: string | null;
  created_at: string;
}

const ManageMunicipalities = () => {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMunicipality, setEditingMunicipality] = useState<Municipality | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    emblem_url: '',
  });
  const [emblemFile, setEmblemFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchMunicipalities();
  }, []);

  const fetchMunicipalities = async () => {
    try {
      const { data, error } = await supabase
        .from('municipalities')
        .select('*')
        .order('name');

      if (error) throw error;
      setMunicipalities(data || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar redes municipais',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setEmblemFile(file);
      await uploadEmblem(file);
    }
  };

  const uploadEmblem = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setFormData(prev => ({ ...prev, emblem_url: '' })); // Clear previous URL during upload

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `emblems/${fileName}`;

    try {
      const { data, error } = await supabase.storage
        .from('municipality_emblems')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (event) => {
            if (event.totalBytes > 0) {
              setUploadProgress(Math.round((event.loaded / event.totalBytes) * 100));
            }
          },
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('municipality_emblems')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, emblem_url: publicUrlData.publicUrl }));
      toast({
        title: 'Upload de brasão concluído!',
        description: 'A imagem foi enviada com sucesso.',
      });
    } catch (error: any) {
      console.error('Error uploading emblem:', error);
      toast({
        title: 'Erro no upload do brasão',
        description: error.message || 'Não foi possível enviar a imagem.',
        variant: 'destructive',
      });
      setEmblemFile(null);
      setFormData(prev => ({ ...prev, emblem_url: '' }));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeEmblem = () => {
    setEmblemFile(null);
    setFormData(prev => ({ ...prev, emblem_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); // Inicia o estado de carregamento
    console.log('Attempting to save municipality. Current formData:', formData);
    console.log('Editing municipality:', editingMunicipality);

    try {
      // Validate form data
      municipalitySchema.parse(formData);
      console.log('Form data validated successfully.');

      if (editingMunicipality) {
        console.log('Updating existing municipality with ID:', editingMunicipality.id);
        const { error } = await supabase
          .from('municipalities')
          .update(formData)
          .eq('id', editingMunicipality.id);

        if (error) {
          console.error('Supabase update error:', error); // Log do erro do Supabase
          throw error;
        }
        toast({ title: 'Rede municipal atualizada com sucesso!' });
        console.log('Municipality updated successfully.');
      } else {
        // This page is for managing existing ones, creation is in MunicipalNetworkSetup
        toast({
          title: 'Erro',
          description: 'Funcionalidade de criação não disponível aqui. Use a página de configuração inicial.',
          variant: 'destructive',
        });
        return;
      }

      setDialogOpen(false);
      setEditingMunicipality(null);
      resetForm();
      fetchMunicipalities();
    } catch (error) {
      console.error('Error during municipality save:', error);
      toast({
        title: 'Erro ao salvar rede municipal',
        description: error instanceof z.ZodError ? error.errors[0].message : error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false); // Garante que o estado de carregamento seja redefinido
      console.log('Loading state reset to false.');
    }
  };

  const handleDelete = async (municipalityId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta rede municipal? Esta ação é irreversível e removerá todas as escolas, usuários e históricos associados a ela.')) return;

    try {
      // Delete related profiles (municipal_admin, school_admin, secretary, teacher)
      const { data: profilesToDelete, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('municipality_id', municipalityId);

      if (profilesError) throw profilesError;

      if (profilesToDelete && profilesToDelete.length > 0) {
        const userIdsToDelete = profilesToDelete.map(p => p.id);
        for (const userId of userIdsToDelete) {
          await supabase.auth.admin.deleteUser(userId);
        }
      }

      // Delete related schools
      const { data: schoolsToDelete, error: schoolsError } = await supabase
        .from('schools')
        .select('id')
        .eq('municipality_id', municipalityId);

      if (schoolsError) throw schoolsError;

      if (schoolsToDelete && schoolsToDelete.length > 0) {
        const schoolIdsToDelete = schoolsToDelete.map(s => s.id);
        await supabase.from('schools').delete().in('id', schoolIdsToDelete);
      }

      // Delete the municipality itself
      const { error } = await supabase
        .from('municipalities')
        .delete()
        .eq('id', municipalityId);

      if (error) throw error;
      toast({ title: 'Rede municipal excluída com sucesso!' });
      fetchMunicipalities();
    } catch (error) {
      toast({
        title: 'Erro ao excluir rede municipal',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (municipality: Municipality) => {
    setEditingMunicipality(municipality);
    setFormData({
      name: municipality.name,
      cnpj: municipality.cnpj || '',
      emblem_url: municipality.emblem_url || '',
    });
    setEmblemFile(null); // Clear file input when editing
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cnpj: '',
      emblem_url: '',
    });
    setEmblemFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setEditingMunicipality(null);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="border-b bg-card shadow-school">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <img src={correctLogo} alt="Correct Logo" className="h-16 w-16" />
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Gerenciar Redes Municipais
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center text-muted-foreground">Carregando redes municipais...</div>
        ) : municipalities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhuma rede municipal cadastrada ainda.</p>
              <Link to="/municipal-network-setup">
                <Button className="mt-4">Cadastrar Nova Rede Municipal</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {municipalities.map((municipality) => (
              <Card key={municipality.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{municipality.name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(municipality)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(municipality.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {municipality.cnpj && (
                      <p className="text-muted-foreground">
                        CNPJ: {municipality.cnpj}
                      </p>
                    )}
                    {municipality.emblem_url && (
                      <div className="flex items-center gap-2">
                        <img src={municipality.emblem_url} alt="Brasão" className="h-8 w-8 object-contain" />
                        <p className="text-muted-foreground">Brasão carregado</p>
                      </div>
                    )}
                    <p className="text-muted-foreground">
                      Criado em: {new Date(municipality.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMunicipality ? 'Editar Rede Municipal' : 'Nova Rede Municipal'}
            </DialogTitle>
            <DialogDescription>
              {editingMunicipality ? 'Atualize os dados da rede municipal.' : 'Preencha os dados da nova rede municipal.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Rede Municipal *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Secretaria Municipal de Educação de LEM"
                required
              />
            </div>
            <div>
              <Label htmlFor="cnpj">CNPJ da Rede Municipal</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="Ex: 00.000.000/0001-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emblemFile">Brasão/Logo da Rede Municipal</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="emblemFile"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="flex-1"
                  disabled={uploading}
                />
                {(formData.emblem_url || emblemFile) && (
                  <Button variant="destructive" size="icon" onClick={removeEmblem} disabled={uploading}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {uploading && (
                <Progress value={uploadProgress} className="w-full mt-2" />
              )}
              {formData.emblem_url && (
                <div className="mt-4 flex items-center space-x-4">
                  <img src={formData.emblem_url} alt="Brasão da Rede Municipal" className="h-20 w-20 object-contain border rounded-md" />
                  <p className="text-sm text-muted-foreground">Imagem carregada</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                (Opcional) Faça o upload de uma imagem para o brasão ou logo da rede municipal.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || uploading}> {/* Desabilita se estiver carregando ou fazendo upload */}
                {editingMunicipality ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageMunicipalities;