import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WORKLOAD_BY_GRADE, SUBJECT_CATEGORIES } from "@/lib/workloadData";

const GRADE_LEVELS = ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"];
const CATEGORIES = ["Base Nacional Comum", "Base Diversificada"];

interface WorkloadConfig {
  id?: string;
  grade_level: string;
  subject_name: string;
  workload: number;
  category: string;
  academic_year: number;
}

const WorkloadManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const currentYear = new Date().getFullYear();
  const [academicYear, setAcademicYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [configurations, setConfigurations] = useState<WorkloadConfig[]>([]);
  const [newSubject, setNewSubject] = useState({
    grade_level: "1º Ano",
    subject_name: "",
    workload: 0,
    category: "Base Nacional Comum",
  });

  useEffect(() => {
    loadAvailableYears();
  }, []);

  useEffect(() => {
    loadConfigurations();
  }, [academicYear]);

  const loadAvailableYears = async () => {
    try {
      const { data, error } = await supabase
        .from("workload_configurations")
        .select("academic_year");

      if (error) throw error;
      
      if (data && data.length > 0) {
        const years = [...new Set(data.map(d => d.academic_year))].sort((a, b) => b - a);
        
        // Adiciona o ano atual se não existir
        if (!years.includes(currentYear)) {
          years.push(currentYear);
          years.sort((a, b) => b - a);
        }
        
        setAvailableYears(years);
      } else {
        // Se não há dados, usa apenas o ano atual
        setAvailableYears([currentYear]);
      }
    } catch (error: any) {
      console.error("Erro ao carregar anos:", error);
      setAvailableYears([currentYear]); // Fallback para o ano atual
    }
  };

  const loadConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from("workload_configurations")
        .select("*")
        .eq("academic_year", academicYear)
        .order("grade_level")
        .order("category")
        .order("subject_name");

      if (error) throw error;
      setConfigurations(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar as configurações",
        variant: "destructive",
      });
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject.subject_name || !newSubject.workload) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from("workload_configurations").insert([
        {
          ...newSubject,
          academic_year: academicYear,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Disciplina adicionada com sucesso",
      });

      setNewSubject({
        grade_level: "1º Ano",
        subject_name: "",
        workload: 0,
        category: "Base Nacional Comum",
      });
      await loadAvailableYears();
      loadConfigurations();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar a disciplina",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWorkload = async (id: string, workload: number) => {
    try {
      const { error } = await supabase
        .from("workload_configurations")
        .update({ workload })
        .eq("id", id);

      if (error) throw error;

      setConfigurations(
        configurations.map((c) => (c.id === id ? { ...c, workload } : c))
      );
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar a carga horária",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("workload_configurations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Disciplina removida com sucesso",
      });
      await loadAvailableYears();
      loadConfigurations();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover a disciplina",
        variant: "destructive",
      });
    }
  };

  const handleAddNewYear = () => {
    const currentYear = new Date().getFullYear();
    const newYear = Math.max(...availableYears, currentYear) + 1;
    setAcademicYear(newYear);
    if (!availableYears.includes(newYear)) {
      setAvailableYears([...availableYears, newYear].sort((a, b) => b - a));
    }
  };

  const handleAddCustomYear = (year: number) => {
    if (year < 1900 || year > 2100) {
      toast({
        title: "Erro",
        description: "Por favor, insira um ano válido entre 1900 e 2100",
        variant: "destructive",
      });
      return;
    }
    
    setAcademicYear(year);
    if (!availableYears.includes(year)) {
      setAvailableYears([...availableYears, year].sort((a, b) => b - a));
    }
  };

  const importDefaultWorkloads = async (year: number) => {
    try {
      setLoading(true);
      const workloadsToInsert = [];

      for (const [gradeLevel, subjects] of Object.entries(WORKLOAD_BY_GRADE)) {
        for (const [subjectName, workload] of Object.entries(subjects)) {
          const category = SUBJECT_CATEGORIES[subjectName] || "Base Nacional Comum";
          workloadsToInsert.push({
            academic_year: year,
            grade_level: gradeLevel,
            subject_name: subjectName,
            workload: workload,
            category: category,
          });
        }
      }

      const { error } = await supabase
        .from("workload_configurations")
        .insert(workloadsToInsert);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${workloadsToInsert.length} disciplinas importadas para o ano ${year}`,
      });

      await loadAvailableYears();
      await loadConfigurations();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível importar as disciplinas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card shadow-school">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <img src="/correct-logo.png" alt="Correct Logo" className="h-24 w-24" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary">
                Gerenciamento de Carga Horária
              </h1>
              <p className="text-muted-foreground">
                Configure as cargas horárias por disciplina e série
              </p>
            </div>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {configurations.length === 0 && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Importar Disciplinas Padrão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Nenhuma disciplina encontrada para o ano {academicYear}. 
                Você pode importar as disciplinas padrão com as cargas horárias da grade curricular.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => importDefaultWorkloads(academicYear)} disabled={loading}>
                  Importar disciplinas padrão para {academicYear}
                </Button>
                <Input
                  type="number"
                  placeholder="Importar para outro ano..."
                  className="w-48"
                  min="1900"
                  max="2100"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = parseInt((e.target as HTMLInputElement).value);
                      if (value && value >= 1900 && value <= 2100) {
                        importDefaultWorkloads(value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Adicionar Nova Disciplina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 mb-4">
              <div className="flex-1 space-y-2">
                <Label>Selecione ou adicione um ano letivo</Label>
                <div className="flex gap-2">
                  <Select
                    value={academicYear.toString()}
                    onValueChange={(value) => setAcademicYear(parseInt(value))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Ex: 2020, 2021..."
                    className="w-40"
                    min="1900"
                    max="2100"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = parseInt((e.target as HTMLInputElement).value);
                        if (value) {
                          handleAddCustomYear(value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleAddNewYear}
                    title="Adicionar próximo ano"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Digite um ano e pressione Enter para adicioná-lo à lista
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Série</Label>
                <select
                  value={newSubject.grade_level}
                  onChange={(e) =>
                    setNewSubject({ ...newSubject, grade_level: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {GRADE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <select
                  value={newSubject.category}
                  onChange={(e) =>
                    setNewSubject({ ...newSubject, category: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Nome da Disciplina</Label>
                <Input
                  value={newSubject.subject_name}
                  onChange={(e) =>
                    setNewSubject({ ...newSubject, subject_name: e.target.value })
                  }
                  placeholder="Ex: Matemática"
                />
              </div>
              <div className="space-y-2">
                <Label>Carga Horária</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={newSubject.workload}
                    onChange={(e) =>
                      setNewSubject({
                        ...newSubject,
                        workload: parseInt(e.target.value) || 0,
                      })
                    }
                    min="0"
                  />
                  <Button onClick={handleAddSubject} disabled={loading}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Disciplinas Cadastradas - Ano Letivo {academicYear}
              <span className="ml-4 text-sm font-normal text-muted-foreground">
                ({configurations.length} disciplina{configurations.length !== 1 ? 's' : ''})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {configurations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma disciplina cadastrada para este ano letivo.
                <br />
                Adicione disciplinas usando o formulário acima.
              </div>
            ) : (
              <div className="space-y-6">
                {GRADE_LEVELS.map((gradeLevel) => {
                  const gradeConfigs = configurations.filter(c => c.grade_level === gradeLevel);
                  if (gradeConfigs.length === 0) return null;
                  
                  const gradeTotal = gradeConfigs.reduce((sum, c) => sum + c.workload, 0);
                  
                  return (
                    <div key={gradeLevel}>
                      <h3 className="text-lg font-semibold mb-3 flex items-center justify-between">
                        <span>{gradeLevel}</span>
                        <span className="text-sm font-normal text-muted-foreground">
                          Total: {gradeTotal}h
                        </span>
                      </h3>
                      
                      {CATEGORIES.map((category) => {
                        const categoryConfigs = gradeConfigs
                          .filter(c => c.category === category)
                          .sort((a, b) => b.workload - a.workload);
                        
                        if (categoryConfigs.length === 0) return null;
                        
                        const categoryTotal = categoryConfigs.reduce((sum, c) => sum + c.workload, 0);
                        
                        return (
                          <div key={category} className="mb-4">
                            <h4 className="text-sm font-medium mb-2 text-muted-foreground flex items-center justify-between px-2">
                              <span>{category}</span>
                              <span>Subtotal: {categoryTotal}h</span>
                            </h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Disciplina</TableHead>
                                  <TableHead className="text-center">Carga Horária</TableHead>
                                  <TableHead className="text-center">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {categoryConfigs.map((config) => (
                                  <TableRow key={config.id}>
                                    <TableCell>{config.subject_name}</TableCell>
                                    <TableCell className="text-center">
                                      <Input
                                        type="number"
                                        value={config.workload}
                                        onChange={(e) =>
                                          handleUpdateWorkload(
                                            config.id!,
                                            parseInt(e.target.value) || 0
                                          )
                                        }
                                        className="w-24 mx-auto"
                                        min="0"
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(config.id!)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })}
                      
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <div className="flex justify-between items-center font-bold">
                          <span>Total {gradeLevel}</span>
                          <span>{gradeTotal}h</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default WorkloadManagement;