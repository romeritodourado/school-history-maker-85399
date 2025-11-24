import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import correctLogo from "/correct-logo.png";
import { useAuth } from '@/contexts/AuthContext';

interface Student {
  id: string;
  full_name: string; // Changed from name
  mother_name: string;
  father_name: string | null;
  birth_date: string; // Changed from birthdate
  birth_place: string;
  birth_state: string;
  student_status: string | null;
  grade_series: string | null;
  observations: string | null;
  school_id: string | null;
  schools: { name: string, municipality_id: string } | null;
}

const StudentList = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { role: currentUserRole, profile: currentUserProfile } = useAuth();

  useEffect(() => {
    fetchStudents();
  }, [currentUserRole, currentUserProfile]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = students.filter((student) =>
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.mother_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.schools?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [searchTerm, students]);

  const fetchStudents = async () => {
    try {
      let query = supabase
        .from("students")
        .select(`
          id,
          full_name,
          mother_name,
          father_name,
          birth_date,
          birth_place,
          birth_state,
          student_status,
          grade_series,
          observations,
          school_id,
          schools (name, municipality_id)
        `)
        .order("full_name"); // Changed from name to full_name

      if (currentUserRole === 'municipal_admin' && currentUserProfile?.municipality_id) {
        query = query.in('school_id', supabase.from('schools').select('id').eq('municipality_id', currentUserProfile.municipality_id));
      } else if (currentUserRole === 'school_admin' || currentUserRole === 'secretary' || currentUserRole === 'teacher') {
        query = query.eq('school_id', currentUserProfile?.school_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStudents(data || []);
      setFilteredStudents(data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de alunos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (studentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este aluno e todos os seus históricos? Esta ação é irreversível.')) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;
      toast({ title: 'Aluno excluído com sucesso!' });
      fetchStudents();
    } catch (error) {
      toast({
        title: 'Erro ao excluir aluno',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card shadow-school">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <img src={correctLogo} alt="Correct Logo" className="h-16 w-16" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary">Lista de Alunos</h1>
              <p className="text-muted-foreground">Gerenciar históricos escolares</p>
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
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do aluno ou mãe..." // Updated placeholder
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Link to="/novo-historico">
            <Button>Novo Histórico</Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Carregando...</div>
        ) : filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {searchTerm ? "Nenhum aluno encontrado" : "Nenhum histórico cadastrado ainda"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="hover:shadow-school transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">{student.full_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 grid gap-2 text-sm">
                    <p>
                      <span className="font-semibold">Mãe:</span> {student.mother_name || 'N/A'}
                    </p>
                    <p>
                      <span className="font-semibold">Escola:</span> {student.schools?.name || 'N/A'}
                    </p>
                    <p>
                      <span className="font-semibold">Data de Nascimento:</span>{" "}
                      {student.birth_date ? new Date(student.birth_date + 'T00:00:00').toLocaleDateString("pt-BR") : 'N/A'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/visualizar/${student.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </Button>
                    </Link>
                    <Link to={`/editar/${student.id}`}>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </Link>
                    {(currentUserRole === 'super_admin' || 
                      (currentUserRole === 'municipal_admin' && student.schools?.municipality_id === currentUserProfile?.municipality_id) ||
                      ((currentUserRole === 'school_admin' || currentUserRole === 'secretary') && student.school_id === currentUserProfile?.school_id)) && (
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(student.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentList;