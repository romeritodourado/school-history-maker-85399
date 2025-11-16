import { Button } from "@/components/ui/button";
import { FileText, Plus, Users, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import schoolLogo from "@/assets/school-logo.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card shadow-school">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <img src={schoolLogo} alt="Escola Municipal Aldori Luiz Tolazzi" className="h-16 w-16" />
            <div>
              <h1 className="text-2xl font-bold text-primary">Sistema de Histórico Escolar</h1>
              <p className="text-muted-foreground">Escola Municipal Aldori Luiz Tolazzi</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold text-foreground">Gestão de Históricos Escolares</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Sistema completo para criar, gerenciar e exportar históricos escolares do Ensino Fundamental
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/novo-historico">
            <div className="group cursor-pointer rounded-lg border bg-card p-6 transition-all hover:shadow-school">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">Novo Histórico</h3>
              <p className="text-muted-foreground">
                Criar um novo histórico escolar para um aluno
              </p>
            </div>
          </Link>

          <Link to="/lista-alunos">
            <div className="group cursor-pointer rounded-lg border bg-card p-6 transition-all hover:shadow-school">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">Lista de Alunos</h3>
              <p className="text-muted-foreground">
                Ver e gerenciar históricos existentes
              </p>
            </div>
          </Link>

          <Link to="/lista-alunos">
            <div className="group cursor-pointer rounded-lg border bg-card p-6 transition-all hover:shadow-school">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">Exportar Históricos</h3>
              <p className="text-muted-foreground">
                Baixar históricos em PDF ou Excel
              </p>
            </div>
          </Link>

          <Link to="/carga-horaria">
            <div className="group cursor-pointer rounded-lg border bg-card p-6 transition-all hover:shadow-school">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/80 text-primary-foreground">
                <Settings className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">Gerenciar Carga Horária</h3>
              <p className="text-muted-foreground">
                Configurar disciplinas e cargas horárias
              </p>
            </div>
          </Link>
        </div>

        <div className="mt-12 rounded-lg border bg-card p-8">
          <h3 className="mb-4 text-2xl font-semibold text-card-foreground">Recursos do Sistema</h3>
          <ul className="grid gap-4 md:grid-cols-2">
            <li className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Cadastro completo de dados do aluno e responsáveis</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Registro de notas por trimestre e ano letivo</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Controle de carga horária e faltas</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Exportação em PDF e Excel (.xls)</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Armazenamento seguro dos dados</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Formato oficial da Rede Municipal de Ensino</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default Index;
