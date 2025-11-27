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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Importar Select

type AppRole = 'super_admin' | 'municipal_secretary' | 'network_manager' | 'school_admin' | 'secretary' | 'assistente_administrativo';

interface Municipality {
  id: string;
  name: string;
  cnpj: string | null;
  emblem_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
}

const CITIES = [
  "Luís Eduardo Magalhães",
  "Salvador",
  "Feira de Santana",
  "Vitória da Conquista",
  "Barreiras",
  "São Paulo",
  "Rio de Janeiro",
  "Brasília",
  "Outra" // Opção para digitar caso a cidade não esteja na lista
];

const ManageMunicipalities = () => {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMunicipality, setEditingMunicipality] = useState<Municipality | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    emblem_url: '',
    address: '',
    city: '',
    state: '',
  });
  const [emblemFile, setEmblemFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCustomCityInput, setShowCustomCityInput] = useState(false); // Novo estado para input de cidade personalizada

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchMunicipalities();
  }, []);

  const fetchMunicipalities = async () => {
    console.log('fetchMunicipalities: Iniciando busca de redes municipais...');
    setPageLoading(true);
    try {
      const { data, error } = await supabase
        .from('municipalities')
        .select('*')
        .order('name');

      if (error) {
        console.error('fetchMunicipalities: Erro do Supabase:', error);
        throw error;
      }
      setMunicipalities(data || []);
      console.log('fetchMunicipalities: Redes municipais buscadas com sucesso:', data);
    } catch (error) {
      console.error('fetchMunicipalities: Erro no bloco catch:', error);
      toast({
        title: 'Erro ao carregar redes municipais',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setPageLoading(false);
      console.log('fetchMunicipalities: Finalizado, pageLoading definido como false.');
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
    setFormData(prev => ({ ...prev, emblem_url: '' }));

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
    setIsSubmitting(true);
    console.log('handleSubmit: Iniciando submissão do formulário.');

    try {
      console.log('handleSubmit: Validando dados do formulário...');
      municipalitySchema.parse(formData);
      console.log('handleSubmit: Dados do formulário validados com sucesso.');

      if (editingMunicipality) {
        console.log('handleSubmit: Atualizando rede municipal existente com ID:', editingMunicipality.id);
        const { data, error, count } = await supabase
          .from('municipalities')
          .update(formData)
          .eq('id', editingMunicipality.id)
          .select();

        if (error) {
          console.error('handleSubmit: Erro de atualização do Supabase:', error);
          throw error;
        }

        if (!data || data.length === 0) {
          console.warn('handleSubmit: A atualização do Supabase não afetou nenhuma linha. Dados:', data, 'Count:', count);
          toast({
            title: 'Aviso',
            description: 'Nenhuma alteração foi salva ou a rede municipal não foi encontrada. Verifique as permissões.',
            variant: 'default',
          });
        } else {
          toast({ title: 'Rede municipal atualizada com sucesso!' });
          console.log('handleSubmit: Rede municipal atualizada com sucesso. Dados:', data);
        }
      } else {
        console.log('handleSubmit: Tentativa de criar rede municipal no diálogo de edição. Isso não deveria acontecer.');
        toast({
          title: 'Erro',
          description: 'Funcionalidade de criação não disponível aqui. Use a página de configuração inicial.',
          variant: 'destructive',
        });
        return; 
      }

      console.log('handleSubmit: Tentando fechar o diálogo e resetar o formulário.');
      setDialogOpen(false); 
      resetForm(); 
      console.log('handleSubmit: Diálogo fechado e formulário resetado. Agora buscando redes municipais...');

      await fetchMunicipalities();
      console.log('handleSubmit: fetchMunicipalities concluído.');

    } catch (error) {
      console.error('handleSubmit: Erro no bloco catch:', error);
      toast({
        title: 'Erro ao salvar rede municipal',
        description: error instanceof z.ZodError ? error.errors[0].message : error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      console.log('handleSubmit: Submissão finalizada, isSubmitting definido como false.');
    }
  };

  const handleDelete = async (municipalityId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta rede municipal? Esta ação é irreversível e removerá todas as escolas, usuários e históricos associados a ela.')) return;

    try {
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

      const { data: schoolsToDelete, error: schoolsError } = await supabase
        .from('schools')
        .select('id')
        .eq('municipality_id', municipalityId);

      if (schoolsError) throw schoolsError;

      if (schoolsToDelete && schoolsToDelete.length > 0) {
        const schoolIdsToDelete = schoolsToDelete.map(s => s.id);
        await supabase.from('schools').delete().in('id', schoolIdsToDelete);
      }

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
      address: municipality.address || '',
      city: municipality.city || '',
      state: municipality.state || '',
    });
    setEmblemFile(null);
    setShowCustomCityInput(municipality.city ? !CITIES.includes(municipality.city) : false); // Define se o input customizado deve ser mostrado
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cnpj: '',
      emblem_url: '',
      address: '',
      city: '',
      state: '',
    });
    setEmblemFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setEditingMunicipality(null);
    setShowCustomCityInput(false);
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
        {pageLoading ? (
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
                    {municipality.address && (
                      <p className="text-muted-foreground">
                        Endereço: {municipality.address}
                      </p>
                    )}
                    {municipality.city && municipality.state && (
                      <p className="text-muted-foreground">
                        Localização: {municipality.city} - {municipality.state}
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
        if (!open) {
          resetForm();
          fetchMunicipalities();
        }
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
            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ex: Rua das Flores, 123, Centro"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => {
                    setFormData({ ...formData, city: value });
                    setShowCustomCityInput(value === "Outra");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map((cityName) => (
                      <SelectItem key={cityName} value={cityName}>
                        {cityName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showCustomCityInput && (
                  <Input
                    id="customCity"
                    value={formData.city !== "Outra" ? formData.city : ""}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Digite o nome da cidade"
                    className="mt-2"
                    required
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado (UF) *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Ex: BA"
                  maxLength={2}
                  required
                />
              </div>
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
                  disabled={uploading || isSubmitting}
                />
                {(formData.emblem_url || emblemFile) && (
                  <Button variant="destructive" size="icon" onClick={removeEmblem} disabled={uploading || isSubmitting}>
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
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading || isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pageLoading || uploading || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingMunicipality ? 'Atualizando...' : 'Criando...'}
                  </>
                ) : (
                  editingMunicipality ? 'Atualizar' : 'Criar'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageMunicipalities;