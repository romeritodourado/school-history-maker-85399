// Carga horária padrão por disciplina e série
// Baseado na grade curricular da escola (2021-2025)
// Total: 800h por ano

// Categorização das disciplinas
export const SUBJECT_CATEGORIES: { [subject: string]: string } = {
  "Língua Portuguesa": "Base Nacional Comum",
  "Matemática": "Base Nacional Comum",
  "Ciências": "Base Nacional Comum",
  "Geografia": "Base Nacional Comum",
  "História": "Base Nacional Comum",
  "Educação Física": "Base Nacional Comum",
  "Arte": "Base Nacional Comum",
  "Ensino Religioso": "Base Nacional Comum",
  "Ciências Soc. e Naturais": "Base Nacional Comum",
  "Ciênc. Fís. e Biológicas": "Base Nacional Comum",
  "Língua Est. Moderna (Inglês)": "Base Diversificada",
  "Produção Textual": "Base Diversificada",
  "Orientação para o trabalho": "Base Diversificada",
  "Socio-Cultural": "Base Diversificada",
};

export const WORKLOAD_BY_GRADE: { [gradeLevel: string]: { [subject: string]: number } } = {
  "1º Ano": {
    "Língua Portuguesa": 280,
    "Matemática": 200,
    "Ciências": 40,
    "Geografia": 40,
    "História": 40,
    "Educação Física": 80,
    "Arte": 40,
    "Ensino Religioso": 40,
    "Produção Textual": 40,
  },
  "2º Ano": {
    "Língua Portuguesa": 280,
    "Matemática": 200,
    "Ciências": 40,
    "Geografia": 40,
    "História": 40,
    "Educação Física": 80,
    "Arte": 40,
    "Ensino Religioso": 40,
    "Produção Textual": 40,
  },
  "3º Ano": {
    "Língua Portuguesa": 160,
    "Matemática": 200,
    "Ciências": 80,
    "Geografia": 80,
    "História": 80,
    "Educação Física": 80,
    "Arte": 40,
    "Ensino Religioso": 40,
    "Produção Textual": 40,
  },
  "4º Ano": {
    "Língua Portuguesa": 160,
    "Matemática": 200,
    "Ciências": 80,
    "Geografia": 80,
    "História": 80,
    "Educação Física": 80,
    "Arte": 40,
    "Ensino Religioso": 40,
    "Produção Textual": 40,
  },
  "5º Ano": {
    "Língua Portuguesa": 160,
    "Matemática": 200,
    "Ciências": 80,
    "Geografia": 80,
    "História": 80,
    "Educação Física": 80,
    "Arte": 40,
    "Ensino Religioso": 40,
    "Produção Textual": 40,
  },
};

// Verifica se a série utiliza relatório ao invés de notas numéricas
export const usesReportInsteadOfGrades = (gradeLevel: string): boolean => {
  return gradeLevel === "1º Ano";
};
