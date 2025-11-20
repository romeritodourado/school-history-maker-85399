import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import schoolLogo from "@/assets/school-logo.png";

interface Student {
  id: string;
  full_name: string;
  mother_name: string;
  birth_date: string;
  birth_place: string;
}

const StudentList = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = students.filter((student) =>
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.mother_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [searchTerm, students]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("full_name");

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card shadow-school">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <img src={schoolLogo} alt="Logo" className="h-16 w-16" />
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
              placeholder="Buscar por nome do aluno ou mãe..."
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
                      <span className="font-semibold">Mãe:</span> {student.mother_name}
                    </p>
                    <p>
                      <span className="font-semibold">Data de Nascimento:</span>{" "}
                      {new Date(student.birth_date + 'T00:00:00').toLocaleDateString("pt-BR")}
                    </p>
                    <p>
                      <span className="font-semibold">Naturalidade:</span> {student.birth_place}
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