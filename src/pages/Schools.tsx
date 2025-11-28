import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, School, Trash2, Edit, Building2, UploadCloud, FileText } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import correctLogo from "/correct-logo.png"; // Importar a logo
import { Link } from 'react-router-dom'; // Importar Link
import { brazilianStates, brazilianCities } from '@/lib/brazilianStatesAndCities'; // Importar dados de estados e cidades

type AppRole = 'super_admin' | 'municipal_secretary' | 'network_manager' | 'school_admin' | 'secretary' | 'teacher';

interface SchoolData {
  id: string;
  name: string;
  inep: string | null;
  municipality_id: string | null;
  municipality_name?: string;
  address: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  authorization_decree_url: string | null;
  official_gazette_url: string | null;
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
    address: '',
    city: '', // Inicializar como string vazia
    state: '', // Inicializar como string vazia
    logo_url: '',
    authorization_decree_url: '',
    official_gazette_url: '',
  });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [showCustomCityInput, setShowCustomCityInput] = useState(false); // Estado para controlar input de cidade personalizada

  const { toast } = useToast();
  const navigate = useNavigate();
  const { role: currentUserRole, profile: currentUserProfile } = useAuth();

  useEffect(() => {
    fetchData();
  }, [currentUserRole, currentUserProfile]);

  useEffect(() => {
    // Reset city if state changes or if the selected city is no longer in the list for the new state
    // Also, if state is cleared, clear city and hide custom input
    if (!formData.state) {
      setFormData(prev => ({ ...prev, city: "" }));
      setShowCustomCityInput(false);
    } else if (formData.city && !brazilianCities[formData.state]?.includes(formData.city) && formData.city !== "Outra") {
      setFormData(prev => ({ ...prev, city: "" }));
      setShowCustomCityInput(false);
    }
  }, [formData.state]);

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

      if (currentUserRole === 'municipal_secretary' || currentUserRole === 'network_manager' && currentUserProfile?.municipality_id) {
        query = query.eq('id', currentUserProfile.municipality_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMunicipalities(data || []);
      if (data && data.length > 0 && (currentUserRole === 'municipal_secretary' || currentUserRole === 'network_manager') && currentUserProfile?.municipality_id) {
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
          address,
          city,
          state,
          logo_url,
          authorization_decree_url,
          official_gazette_url,
          municipalities (name)
        `)
        .order('name');

      if ((currentUserRole === 'municipal_secretary' || currentUserRole === 'network_manager') && currentUserProfile?.municipality_id) {
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
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (
    file: File,
    field: 'logo_url'
  ) => {
    setUploading(true);
    setUploadProgress(0);

    const fileExt = file.name.split('.').pop();
    const fileName = `${field}_${Date.now()}.${fileExt}`;
    const filePath = `schools/${fileName}`;

    try {
      const { data, error } = await supabase.storage
        .from('school_assets')
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
        .from('school_assets')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, [field]: publicUrlData.publicUrl }));
      toast({
        title: 'Upload concluído!',
        description: `O arquivo para ${field} foi enviado com sucesso.`,
      });
      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error(`Error uploading ${field}:`, error);
      toast({
        title: 'Erro no upload',
        description: error.message || `Não foi possível enviar o arquivo para ${field}.`,
        variant: 'destructive',
      });
      setFormData(prev => ({ ...prev, [field]: '' }));
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileRemove = (
    field: 'logo_url',
    fileInputRef: React.RefObject<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      schoolSchema.parse(formData);

      if (!formData.municipality_id) {
        toast({
          title: 'Erro de validação',
          description: 'Selecione uma rede municipal.',
          variant: "destructive",
        });
        return;
      }

      if (editingSchool) {
        const { error } = await supabase
          .from('schools')
          .update(formData)
          .eq('id', editingSchool.id);

        if (error) throw error;
        toast({ title: 'Escola atualizada com sucesso!' });
      } else {
        const { error } = await supabase
          .from('schools')
          .insert([formData]);

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
        variant: "destructive",
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
        variant: "destructive",
      });
    }
  };

  const handleEdit = (school: SchoolData) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      inep: school.inep || '',
      municipality_id: school.municipality_id || '',
      address: school.address || '',
      city: school.city || '', // Garante que não seja null
      state: school.state || '', // Garante que não seja null
      logo_url: school.logo_url || '',
      authorization_decree_url: school.authorization_decree_url || '',
      official_gazette_url: school.official_gazette_url || '',
    });
    // Define se o input customizado deve ser mostrado com base nos dados carregados
    setShowCustomCityInput(school.city ? !brazilianCities[school.state || '']?.includes(school.city) : false);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      inep: '',
      municipality_id: (currentUserRole === 'municipal_secretary' || currentUserRole === 'network_manager') && currentUserProfile?.municipality_id ? currentUserProfile.municipality_id : '',
      address: '',
      city: '',
      state: '',
      logo_url: '',
      authorization_decree_url: '',
      official_gazette_url: '',
    });
    setEditingSchool(null);
    if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    setShowCustomCityInput(false); // Reseta o estado do input customizado
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
            <Link to="/"> {/* Adicionado Link aqui */}
              <img src={correctLogo} alt="Correct Logo" className="h-10 w-10" />
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              Gerenciar Escolas
            </h1>
          </div>
          
          {(currentUserRole === 'super_admin' || currentUserRole === 'municipal_secretary' || currentUserRole === 'network_manager') && (
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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      disabled={(currentUserRole === 'municipal_secretary' || currentUserRole === 'network_manager') && !!currentUserProfile?.municipality_id}
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
                  <div>
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Ex: Rua das Flores, 123"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado (UF) *</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => {
                          setFormData(prev => ({ ...prev, state: value, city: "" })); // Reset city when state changes
                          setShowCustomCityInput(false);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {brazilianStates.map((s) => (
                            <SelectItem key={s.uf} value={s.uf}>
                              {s.name} ({s.uf})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade *</Label>
                      <Select
                        value={formData.city}
                        onValueChange={(value) => {
                          setFormData(prev => ({ ...prev, city: value }));
                          setShowCustomCityInput(value === "Outra");
                        }}
                        disabled={!formData.state} // Disable city select if no state is selected
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a cidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.state && brazilianCities[formData.state]?.map((cityName) => (
                            <SelectItem key={cityName} value={cityName}>
                              {cityName}
                            </SelectItem>
                          ))}
                          <SelectItem value="Outra">Outra (digitar)</SelectItem>
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo_url">Logo da Escola</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="logo_url"
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo_url')}
                        ref={logoFileInputRef}
                        className="flex-1"
                        disabled={uploading}
                      />
                      {formData.logo_url && (
                        <Button variant="destructive" size="icon" onClick={() => handleFileRemove('logo_url', logoFileInputRef)} disabled={uploading}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {uploading && <Progress value={uploadProgress} className="w-full mt-2" />}
                    {/* Mensagem de erro para upload da logo */}
                    {!uploading && logoFileInputRef.current?.files?.[0] && !formData.logo_url && (
                      <p className="text-sm text-destructive mt-2">
                        Erro ao carregar a logo. Verifique as permissões do bucket 'school_assets' no Supabase.
                      </p>
                    )}
                    {formData.logo_url && (
                      <div className="mt-2 flex items-center space-x-2">
                        <img src={formData.logo_url} alt="Logo da Escola" className="h-10 w-10 object-contain border rounded-md" />
                        <a href={formData.logo_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Ver Logo</a>
                      </div>
                    )}
                  </div>

                  {/* Campo de texto para Decreto de Autorização */}
                  <div className="space-y-2">
                    <Label htmlFor="authorization_decree_url">Decreto de Autorização</Label>
                    <Input
                      id="authorization_decree_url"
                      value={formData.authorization_decree_url}
                      onChange={(e) => setFormData({ ...formData, authorization_decree_url: e.target.value })}
                      placeholder="Ex: Decreto Nº 123/2024"
                    />
                  </div>

                  {/* Campo de texto para Diário Oficial */}
                  <div className="space-y-2">
                    <Label htmlFor="official_gazette_url">Diário Oficial</Label>
                    <Input
                      id="official_gazette_url"
                      value={formData.official_gazette_url}
                      onChange={(e) => setFormData({ ...formData, official_gazette_url: e.target.value })}
                      placeholder="Ex: Diário Oficial do Município, Edição 456"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={uploading}>
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
                  {(currentUserRole === 'super_admin' || ((currentUserRole === 'municipal_secretary' || currentUserRole === 'network_manager') && school.municipality_id === currentUserProfile?.municipality_id)) && (
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
                  {school.logo_url && (
                    <div className="flex items-center gap-2">
                      <img src={school.logo_url} alt="Logo" className="h-8 w-8 object-contain" />
                      <p className="text-muted-foreground">Logo</p>
                    </div>
                  )}
                  {school.inep && (
                    <p className="text-muted-foreground">
                      INEP: {school.inep}
                    </p>
                  )}
                  {school.address && (
                    <p className="text-muted-foreground">
                      Endereço: {school.address}
                    </p>
                  )}
                  {school.city && school.state && (
                    <p className="text-muted-foreground">
                      Localização: {school.city} - {school.state}
                    </p>
                  )}
                  {school.municipality_name && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Rede: {school.municipality_name}
                    </p>
                  )}
                  {/* Exibindo o texto do Decreto de Autorização */}
                  {school.authorization_decree_url && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Decreto: {school.authorization_decree_url}
                    </p>
                  )}
                  {/* Exibindo o texto do Diário Oficial */}
                  {school.official_gazette_url && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Diário Oficial: {school.official_gazão_url}
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