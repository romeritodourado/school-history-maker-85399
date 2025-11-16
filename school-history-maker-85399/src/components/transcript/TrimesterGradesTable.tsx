import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrimesterGrade } from "@/pages/CreateTranscript";

interface TrimesterGradesTableProps {
  subjects: string[];
  trimesterGrades: TrimesterGrade[];
  setTrimesterGrades: (grades: TrimesterGrade[]) => void;
  schoolPeriod?: { startDate: string; endDate: string; gradeClass: string; shift: string };
  setSchoolPeriod?: (period: { startDate: string; endDate: string; gradeClass: string; shift: string }) => void;
}

export const TrimesterGradesTable = ({ subjects, trimesterGrades, setTrimesterGrades, schoolPeriod, setSchoolPeriod }: TrimesterGradesTableProps) => {
  useEffect(() => {
    if (trimesterGrades.length === 0) {
      const initialGrades: TrimesterGrade[] = [];
      subjects.forEach((subject) => {
        [1, 2, 3].forEach((trimester) => {
          initialGrades.push({
            subject_name: subject,
            trimester,
            grade: "",
            absences: "0",
          });
        });
      });
      setTrimesterGrades(initialGrades);
    }
  }, [subjects, trimesterGrades.length, setTrimesterGrades]);

  const updateGrade = (subjectName: string, trimester: number, field: "grade" | "absences", value: string) => {
    const newGrades = [...trimesterGrades];
    const index = newGrades.findIndex(
      (g) => g.subject_name === subjectName && g.trimester === trimester
    );
    if (index !== -1) {
      newGrades[index] = { ...newGrades[index], [field]: value };
      setTrimesterGrades(newGrades);
    }
  };

  const getGrade = (subjectName: string, trimester: number, field: "grade" | "absences") => {
    const grade = trimesterGrades.find(
      (g) => g.subject_name === subjectName && g.trimester === trimester
    );
    return grade ? grade[field] : "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimento Escolar por Trimestre</CardTitle>
      </CardHeader>
      <CardContent>
        {schoolPeriod && setSchoolPeriod && (
          <div className="mb-6 rounded-lg border bg-muted/50 p-4">
            <h3 className="mb-4 font-semibold text-primary">Rendimento Escolar no Ano Letivo</h3>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial (Dia/Mês)</Label>
                <Input
                  id="startDate"
                  type="text"
                  value={schoolPeriod.startDate}
                  onChange={(e) => setSchoolPeriod({ ...schoolPeriod, startDate: e.target.value })}
                  placeholder="Ex: 05/02"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final (Dia/Mês)</Label>
                <Input
                  id="endDate"
                  type="text"
                  value={schoolPeriod.endDate}
                  onChange={(e) => setSchoolPeriod({ ...schoolPeriod, endDate: e.target.value })}
                  placeholder="Ex: 20/12"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gradeClass">Ano/Turma</Label>
                <Input
                  id="gradeClass"
                  value={schoolPeriod.gradeClass}
                  onChange={(e) => setSchoolPeriod({ ...schoolPeriod, gradeClass: e.target.value })}
                  placeholder="Ex: 5º Ano A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift">Turno</Label>
                <Input
                  id="shift"
                  value={schoolPeriod.shift}
                  onChange={(e) => setSchoolPeriod({ ...schoolPeriod, shift: e.target.value })}
                  placeholder="Matutino/Vespertino"
                />
              </div>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Disciplina</TableHead>
                <TableHead colSpan={2} className="text-center border-l">I Trimestre</TableHead>
                <TableHead colSpan={2} className="text-center border-l">II Trimestre</TableHead>
                <TableHead colSpan={2} className="text-center border-l">III Trimestre</TableHead>
              </TableRow>
              <TableRow>
                <TableHead></TableHead>
                <TableHead className="text-center border-l">Nota</TableHead>
                <TableHead className="text-center">Faltas</TableHead>
                <TableHead className="text-center border-l">Nota</TableHead>
                <TableHead className="text-center">Faltas</TableHead>
                <TableHead className="text-center border-l">Nota</TableHead>
                <TableHead className="text-center">Faltas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((subject) => (
                <TableRow key={subject}>
                  <TableCell className="font-medium">{subject}</TableCell>
                  {[1, 2, 3].map((trimester) => (
                    <>
                      <TableCell key={`${subject}-${trimester}-grade`} className="border-l">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={getGrade(subject, trimester, "grade")}
                          onChange={(e) => updateGrade(subject, trimester, "grade", e.target.value)}
                          className="text-center"
                          placeholder="0.0"
                        />
                      </TableCell>
                      <TableCell key={`${subject}-${trimester}-absences`}>
                        <Input
                          type="number"
                          min="0"
                          value={getGrade(subject, trimester, "absences")}
                          onChange={(e) => updateGrade(subject, trimester, "absences", e.target.value)}
                          className="text-center"
                          placeholder="0"
                        />
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
  );
};
