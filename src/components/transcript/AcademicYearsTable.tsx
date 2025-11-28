import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2 } from "lucide-react";
import { AcademicYear } from "@/pages/CreateTranscript";

interface SchoolOption {
  id: string;
  name: string;
  municipality_id: string;
  city: string | null;
  state: string | null;
}

interface AcademicYearsTableProps {
  academicYears: AcademicYear[];
  setAcademicYears: (years: AcademicYear[]) => void;
  gradeLevels: string[];
  schools: SchoolOption[]; // Adicionado
  selectedSchoolId: string | null; // Adicionado
}

export const AcademicYearsTable = ({ academicYears, setAcademicYears, gradeLevels, schools, selectedSchoolId }: AcademicYearsTableProps) => {
  // Sort years by grade level (descending - newest on top)
  const sortedYears = [...academicYears].sort((a, b) => {
    const gradeA = parseInt(a.grade_level.match(/\d+/)?.[0] || "0");
    const gradeB = parseInt(b.grade_level.match(/\d+/)?.[0] || "0");
    return gradeB - gradeA;
  });

  const addYear = () => {
    const selectedSchool = schools.find(s => s.id === selectedSchoolId);
    setAcademicYears([
      ...academicYears,
      {
        calendar_year: new Date().getFullYear(),
        grade_level: "1º Ano",
        school_name: selectedSchool?.name || "",
        city: selectedSchool?.city || "",
        state: selectedSchool?.state || "",
        shift: "",
        class_name: "",
        reclassified: false,
      },
    ]);
  };

  const removeYear = (index: number) => {
    const newYears = academicYears.filter((_, i) => i !== index);
    setAcademicYears(newYears);
  };

  const updateYear = (index: number, field: keyof AcademicYear, value: string | number | boolean) => {
    const newYears = [...academicYears];
    newYears[index] = { ...newYears[index], [field]: value };
    setAcademicYears(newYears);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Estudos Realizados - Ensino Fundamental</span>
          <Button onClick={addYear} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Ano
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={["0"]} className="w-full">
          {sortedYears.map((year, sortedIndex) => {
            // Find the real index in the original academicYears array
            const realIndex = academicYears.findIndex(
              (y) => y.calendar_year === year.calendar_year && 
                     y.grade_level === year.grade_level &&
                     y.school_name === year.school_name
            );
            
            return (
              <AccordionItem key={sortedIndex} value={sortedIndex.toString()}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-semibold">
                      {year.grade_level} - {year.calendar_year} 
                      {year.school_name && ` - ${year.school_name}`}
                    </span>
                    {academicYears.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeYear(realIndex);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 md:grid-cols-2 pt-4">
                    <div className="space-y-2">
                      <Label>Ano</Label>
                      <Input
                        type="number"
                        value={year.calendar_year}
                        onChange={(e) => updateYear(realIndex, "calendar_year", parseInt(e.target.value))}
                        placeholder="2024"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Série</Label>
                      <Select
                        value={year.grade_level}
                        onValueChange={(value) => updateYear(realIndex, "grade_level", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {gradeLevels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Estabelecimento de Ensino</Label>
                      <Input
                        value={year.school_name}
                        onChange={(e) => updateYear(realIndex, "school_name", e.target.value)}
                        placeholder="Nome da escola"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input
                        value={year.city}
                        onChange={(e) => updateYear(realIndex, "city", e.target.value)}
                        placeholder="Cidade"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>UF</Label>
                      <Input
                        value={year.state}
                        onChange={(e) => updateYear(realIndex, "state", e.target.value)}
                        placeholder="BA"
                        maxLength={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Turno</Label>
                      <Select
                        value={year.shift}
                        onValueChange={(value) => updateYear(realIndex, "shift", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o turno" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Matutino">Matutino</SelectItem>
                          <SelectItem value="Vespertino">Vespertino</SelectItem>
                          <SelectItem value="Noturno">Noturno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Turma</Label>
                      <Input
                        value={year.class_name}
                        onChange={(e) => updateYear(realIndex, "class_name", e.target.value)}
                        placeholder="A, B, C..."
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`reclassified-${sortedIndex}`}
                          checked={(year as any).reclassified || false}
                          onCheckedChange={(checked) => updateYear(realIndex, "reclassified" as keyof AcademicYear, checked)}
                        />
                        <Label htmlFor={`reclassified-${sortedIndex}`} className="text-sm font-normal cursor-pointer">
                          Aluno reclassificado conforme Lei N° 9394/96
                        </Label>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
};