import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Grade } from "@/pages/CreateTranscript";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface GradesTableProps {
  gradeLevel: string;
  grades: Grade[];
  setGrades: (grades: Grade[]) => void;
  customSubjects?: string[];
  setCustomSubjects?: (subjects: string[]) => void;
}

export const GradesTable = ({ gradeLevel, grades, setGrades, customSubjects, setCustomSubjects }: GradesTableProps) => {
  const [newSubject, setNewSubject] = useState("");
  const [useNumericGrades, setUseNumericGrades] = useState(gradeLevel !== "1º Ano");

  const updateGrade = (index: number, field: keyof Grade, value: string) => {
    const newGrades = [...grades];
    newGrades[index] = { ...newGrades[index], [field]: value };
    setGrades(newGrades);
  };

  const updateSubjectName = (index: number, newName: string) => {
    const newGrades = [...grades];
    newGrades[index] = { ...newGrades[index], subject_name: newName };
    setGrades(newGrades);
  };

  const addSubject = () => {
    if (newSubject.trim()) {
      const newGrades = [
        ...grades,
        {
          subject_name: newSubject.trim(),
          grade: "",
          workload: "",
          absences: "0",
        },
      ];
      setGrades(newGrades);
      setNewSubject("");
    }
  };

  const removeSubject = (index: number) => {
    const newGrades = grades.filter((_, i) => i !== index);
    setGrades(newGrades);
  };

  const totalWorkload = grades.reduce((sum, g) => sum + (parseInt(g.workload) || 0), 0);

  return (
    <div className="space-y-4">
      {gradeLevel === "1º Ano" && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="useNumericGrades"
            checked={useNumericGrades}
            onCheckedChange={(checked) => setUseNumericGrades(checked as boolean)}
          />
          <Label htmlFor="useNumericGrades" className="text-sm font-normal">
            Utilizar notas numéricas (aluno estudou em outra escola)
          </Label>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Componente Curricular</TableHead>
            <TableHead className="text-center">Nota</TableHead>
            <TableHead className="text-center">Carga Horária</TableHead>
            <TableHead className="text-center">Faltas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grades.map((grade, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Input
                    value={grade.subject_name}
                    onChange={(e) => updateSubjectName(index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSubject(index)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                {gradeLevel === "1º Ano" && !useNumericGrades ? (
                  index === 0 ? (
                    <div className="flex items-center justify-center">
                      <span className="writing-vertical font-bold text-lg">APROVADO</span>
                    </div>
                  ) : (
                    <div className="h-full"></div>
                  )
                ) : (
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={grade.grade}
                    onChange={(e) => updateGrade(index, "grade", e.target.value)}
                    className="text-center"
                    placeholder="0.0"
                  />
                )}
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min="0"
                  value={grade.workload}
                  onChange={(e) => updateGrade(index, "workload", e.target.value)}
                  className="text-center"
                  placeholder="0"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min="0"
                  value={grade.absences}
                  onChange={(e) => updateGrade(index, "absences", e.target.value)}
                  className="text-center"
                  placeholder="0"
                />
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={2} className="font-bold text-right">
              Carga Horária Total:
            </TableCell>
            <TableCell className="text-center font-bold">{totalWorkload}h</TableCell>
            <TableCell></TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={4}>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome da nova disciplina"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addSubject()}
                  className="flex-1"
                />
                <Button onClick={addSubject} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Disciplina
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      </div>
    </div>
  );
};
