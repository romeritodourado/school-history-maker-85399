import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StudentData {
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
  schools: { 
    name: string, 
    municipality_id: string, 
    address: string | null, 
    city: string | null, 
    state: string | null, 
    logo_url: string | null, 
    authorization_decree_url: string | null, 
    official_gazette_url: string | null,
    municipalities: { // Add this nested object
      name: string;
      emblem_url: string | null;
    } | null;
  } | null;
}

interface AcademicYearData {
  id: string;
  calendar_year: number;
  grade_level: string;
  school_name: string;
  city: string;
  state: string;
  shift: string;
  class_name: string;
  reclassified?: boolean;
}

interface GradeData {
  subject_name: string;
  grade: number | null;
  workload: number | null;
  absences: number;
}

interface TrimesterGradeData {
  subject_name: string;
  trimester: number;
  grade: number | null;
  absences: number;
}

interface TranscriptPreviewProps {
  student: StudentData;
  academicYears: AcademicYearData[];
  grades: { [yearId: string]: GradeData[] };
  trimesterGrades: TrimesterGradeData[];
  schoolPeriod?: { startDate: string; endDate: string; gradeClass: string; shift: string };
}

export const TranscriptPreview = ({ student, academicYears, grades, trimesterGrades, schoolPeriod }: TranscriptPreviewProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString("pt-BR");
  };

  const formatGrade = (grade: number | null) => {
    if (grade === null) return "-";
    return grade.toFixed(1);
  };

  const getTrimesterGrade = (subject: string, trimester: number, field: "grade" | "absences") => {
    const grade = trimesterGrades.find(
      (g) => g.subject_name === subject && g.trimester === trimester
    );
    if (!grade) return "-";
    return field === "grade" ? formatGrade(grade.grade) : grade.absences;
  };

  const municipalityName = student.schools?.municipalities?.name || "Não Informado";
  const schoolName = student.schools?.name || "ESCOLA MUNICIPAL";
  const authorizationDecree = student.schools?.authorization_decree_url || "";
  const officialGazette = student.schools?.official_gazette_url || "";
  const schoolLogoUrl = student.schools?.logo_url;
  const municipalityEmblemUrl = student.schools?.municipalities?.emblem_url;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-primary/5">
          <div className="flex items-center justify-between gap-4 py-4 px-4">
            {/* Municipality Emblem on Left */}
            <div className="w-1/5 flex justify-start">
              {municipalityEmblemUrl && (
                <img src={municipalityEmblemUrl} alt="Brasão da Rede Municipal" className="h-16 w-16 object-contain" />
              )}
            </div>
            
            {/* Central Text */}
            <div className="flex-1 text-center space-y-1">
              <h2 className="text-sm font-bold text-primary uppercase">PREFEITURA MUNICIPAL de {municipalityName}</h2>
              {/* REMOVIDO: <h3 className="text-sm font-bold text-primary uppercase">{municipalityName}</h3> */}
              {/* REMOVIDO: <h3 className="text-sm font-bold text-primary uppercase">SECRETARIA MUNICIPAL DA EDUCAÇÃO</h3> */}
              <h3 className="text-sm font-bold text-primary uppercase">{schoolName}</h3>
              {(authorizationDecree || officialGazette) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {authorizationDecree && `Autorização: ${authorizationDecree}`}
                  {authorizationDecree && officialGazette && ` - `}
                  {officialGazette && `D.O.: ${officialGazette}`}
                </p>
              )}
              <h2 className="mt-2 text-lg font-bold text-primary">HISTÓRICO ESCOLAR - ENSINO FUNDAMENTAL</h2>
            </div>

            {/* School Logo on Right */}
            <div className="w-1/5 flex justify-end">
              {schoolLogoUrl && (
                <img src={schoolLogoUrl} alt="Logo da Escola" className="h-16 w-16 object-contain" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm">
                <span className="font-semibold">ALUNO (A):</span> <span className="font-bold">{student.full_name}</span>
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <p className="text-sm">
                <span className="font-semibold">Mãe:</span> {student.mother_name || "Não informado"}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Data de Nascimento:</span> {formatDate(student.birth_date)}
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <p className="text-sm">
                <span className="font-semibold">Pai:</span> {student.father_name || "Não informado"}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Naturalidade:</span> {student.birth_place || "Não informado"} - {student.birth_state || "BA"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {trimesterGrades.length > 0 && student.student_status === "cursando" && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Rendimento Escolar por Trimestre</h3>
            {schoolPeriod && (schoolPeriod.startDate || schoolPeriod.endDate || schoolPeriod.gradeClass || schoolPeriod.shift) && (
              <p className="text-sm text-muted-foreground mt-2">
                {schoolPeriod.startDate && schoolPeriod.endDate && `Período: ${schoolPeriod.startDate} a ${schoolPeriod.endDate}`}
                {schoolPeriod.gradeClass && ` | Ano/Turma: ${schoolPeriod.gradeClass}`}
                {schoolPeriod.shift && ` | Turno: ${schoolPeriod.shift}`}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Disciplina</TableHead>
                    <TableHead colSpan={2} className="border-l text-center">I Trimestre</TableHead>
                    <TableHead colSpan={2} className="border-l text-center">II Trimestre</TableHead>
                    <TableHead colSpan={2} className="border-l text-center">III Trimestre</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead className="border-l text-center">Nota</TableHead>
                    <TableHead className="text-center">Faltas</TableHead>
                    <TableHead className="border-l text-center">Nota</TableHead>
                    <TableHead className="text-center">Faltas</TableHead>
                    <TableHead className="border-l text-center">Nota</TableHead>
                    <TableHead className="text-center">Faltas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(new Set(trimesterGrades.map((g) => g.subject_name))).map((subject) => (
                    <TableRow key={subject}>
                      <TableCell className="font-medium">{subject}</TableCell>
                      {[1, 2, 3].map((trimester) => (
                        <>
                          <TableCell key={`${subject}-${trimester}-grade`} className="border-l text-center">
                            {getTrimesterGrade(subject, trimester, "grade")}
                          </TableCell>
                          <TableCell key={`${subject}-${trimester}-absences`} className="text-center">
                            {getTrimesterGrade(subject, trimester, "absences")}
                          </TableCell>
                        </>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h3 className="font-semibold">Estudos Realizados - Ensino Fundamental</h3>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ano</TableHead>
                <TableHead>Ano/Série</TableHead>
                <TableHead>Estabelecimento de Ensino</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>UF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {academicYears.map((year) => (
                <TableRow key={year.id}>
                  <TableCell>{year.calendar_year}</TableCell>
                  <TableCell>{year.grade_level}</TableCell>
                  <TableCell>{year.school_name}</TableCell>
                  <TableCell>{year.city}</TableCell>
                  <TableCell>{year.state}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold">Notas Anuais por Série</h3>
        </CardHeader>
        <CardContent className="space-y-6">
          {academicYears.map((year) => {
            const yearGrades = grades[year.id] || [];
            if (yearGrades.length === 0) return null;

            const totalWorkload = yearGrades.reduce((sum, g) => sum + (g.workload || 0), 0);

            return (
              <div key={year.id}>
                <h4 className="mb-3 font-semibold">{year.grade_level} - {year.calendar_year}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Componente Curricular</TableHead>
                      <TableHead className="text-center">Nota</TableHead>
                      <TableHead className="text-center">C.H.</TableHead>
                      <TableHead className="text-center">Faltas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yearGrades.map((grade, index) => (
                      <TableRow key={index}>
                        <TableCell>{grade.subject_name}</TableCell>
                        <TableCell className="text-center">{formatGrade(grade.grade)}</TableCell>
                        <TableCell className="text-center">{grade.workload || "-"}</TableCell>
                        <TableCell className="text-center">{grade.absences}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell colSpan={2} className="text-right">Carga Horária Total:</TableCell>
                      <TableCell className="text-center">{totalWorkload}h</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-center">
            {student.student_status === "concluído" && "CERTIFICADO DE CONCLUSÃO"}
            {student.student_status === "cursando" && "CERTIFICADO DE ESCOLARIDADE"}
            {student.student_status === "transferido" && "CERTIFICADO DE TRANSFERÊNCIA"}
            {student.student_status === "conservado" && "CERTIFICADO DE MATRÍCULA CONSERVADA"}
            {!student.student_status && "CERTIFICADO DE ESCOLARIDADE"} {/* Default if null */}
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-center">
            Certificamos que <span className="font-bold">{student.full_name}</span>
            {student.student_status === "concluído" && ` concluiu no ano de ${academicYears.length > 0 ? academicYears[academicYears.length - 1].calendar_year : new Date().getFullYear()} o `}
            {student.student_status === "cursando" && ` está cursando no ano de ${new Date().getFullYear()} o `}
            {student.student_status === "transferido" && ` foi transferido no ano de ${academicYears.length > 0 ? academicYears[academicYears.length - 1].calendar_year : new Date().getFullYear()} o `}
            {!student.student_status && ` está cursando no ano de ${new Date().getFullYear()} o `} {/* Default if null */}
            <span className="font-bold">{student.grade_series || "Ensino Fundamental"}</span>
            {` do Ensino Fundamental de 9 anos, conforme Histórico Escolar.`}
          </p>
          
          <div className="mt-8 grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="border-t border-foreground pt-2">
                <p className="text-sm font-semibold">Diretor(a)</p>
                {student.schools?.authorization_decree_url && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {student.schools.authorization_decree_url}
                  </p>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-foreground pt-2">
                <p className="text-sm font-semibold">Secretário(a)</p>
                {student.schools?.official_gazette_url && (
                  <p className className="text-xs text-muted-foreground mt-1">
                    {student.schools.official_gazette_url}
                  </p>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-center mt-8 text-muted-foreground">
            Luís Eduardo Magalhães - BA, {new Date().getDate().toString().padStart(2, '0')} de {new Date().toLocaleDateString("pt-BR", { month: 'long' })} de {new Date().getFullYear()}
          </p>
        </CardContent>
      </Card>

      {student.observations && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Observações</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{student.observations}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-xs">
            <p>
              <span className="font-semibold">Observação:</span> Desde 2007, a Rede Municipal de Ensino adotou o Ensino Fundamental de 9 anos.
            </p>
            <div className="mt-4">
              <p className="font-semibold">LEGENDA:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>O = Ótimo = 9,5 a 10,0 (Atingiu plenamente os objetivos)</li>
                <li>MB = Muito Bom = 8,0 a 9,4 (Aprendizagem nivelada)</li>
                <li>B = Bom = 7,0 a 7,9 (Aprendizagem aproximada)</li>
                <li>R = Regular = 5,0 a 6,9 (Aprendizagem insuficiente)</li>
                <li>I = Insuficiente = 0,0 a 4,9 (Não atingiu os objetivos mínimos)</li>
              </ul>
            </div>
            <div className="mt-4">
              <p className="font-semibold">INFORMAÇÃO IMPORTANTE:</p>
              <p className="text-justify">
                O Sistema Municipal de Ensino de Luís Eduardo Magalhães, conforme resolução n°005/2018, 
                publicado no diário oficial do município n°858 de 23/10/2018, o Conselho Municipal de Educação 
                adota o Ciclo Básico de Alfabetização, com dois anos de duração, sem retenção ou promoção, 
                no decorrer deste. Faz-se necessário apenas o relatório dos níveis de habilidades do aluno 
                nas competências de leitura, escrita e raciocínio lógico-matemático em anexo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};