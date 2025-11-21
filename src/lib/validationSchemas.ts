import { z } from 'zod';

// Student validation schema
export const studentSchema = z.object({
  full_name: z.string()
    .trim()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),
  
  mother_name: z.string()
    .trim()
    .min(3, 'Nome da mãe deve ter pelo menos 3 caracteres')
    .max(100, 'Nome da mãe deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),
  
  father_name: z.string()
    .trim()
    .max(100, 'Nome do pai deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]*$/, 'Nome deve conter apenas letras')
    .optional()
    .or(z.literal('')),
  
  birth_date: z.string()
    .refine((date) => {
      const parsed = new Date(date);
      const now = new Date();
      return !isNaN(parsed.getTime()) && parsed < now;
    }, 'Data de nascimento inválida'),
  
  birth_place: z.string()
    .trim()
    .min(2, 'Local de nascimento deve ter pelo menos 2 caracteres')
    .max(100, 'Local de nascimento deve ter no máximo 100 caracteres'),
  
  birth_state: z.string()
    .length(2, 'Estado deve ter 2 caracteres')
    .regex(/^[A-Z]{2}$/, 'Estado deve ser uma sigla válida (ex: BA)'),
  
  observations: z.string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
});

// Grade validation schema (mantido, mas não usado diretamente em CreateTranscript)
export const gradeSchema = z.object({
  grade: z.number()
    .min(0, 'Nota não pode ser negativa')
    .max(10, 'Nota não pode ser maior que 10')
    .optional()
    .nullable(),
  
  absences: z.number()
    .min(0, 'Faltas não podem ser negativas')
    .max(365, 'Número de faltas parece incorreto')
    .optional()
    .nullable(),
  
  workload: z.number()
    .min(0, 'Carga horária não pode ser negativa')
    .max(2000, 'Carga horária não pode exceder 2000 horas')
    .optional()
    .nullable(),
});

// School validation schema
export const schoolSchema = z.object({
  name: z.string()
    .trim()
    .min(3, 'Nome da escola deve ter pelo menos 3 caracteres')
    .max(200, 'Nome da escola deve ter no máximo 200 caracteres'),
  
  inep_code: z.string()
    .trim()
    .regex(/^\d{8}$/, 'Código INEP deve ter 8 dígitos')
    .optional()
    .or(z.literal('')),
  
  address: z.string()
    .trim()
    .max(200, 'Endereço deve ter no máximo 200 caracteres')
    .optional()
    .or(z.literal('')),
  
  city: z.string()
    .trim()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(100, 'Cidade deve ter no máximo 100 caracteres'),
  
  state: z.string()
    .length(2, 'Estado deve ter 2 caracteres')
    .regex(/^[A-Z]{2}$/, 'Estado deve ser uma sigla válida (ex: BA)'),
});

// Academic year validation schema
export const academicYearSchema = z.object({
  calendar_year: z.number()
    .min(1900, 'Ano inválido')
    .max(new Date().getFullYear() + 10, 'Ano não pode estar muito no futuro'),
  
  grade_level: z.string()
    .min(1, 'Série é obrigatória'),
  
  school_name: z.string()
    .trim()
    .min(3, 'Nome da escola deve ter pelo menos 3 caracteres')
    .max(200, 'Nome da escola deve ter no máximo 200 caracteres'),
  
  city: z.string()
    .trim()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(100, 'Cidade deve ter no máximo 100 caracteres'),
  
  state: z.string()
    .length(2, 'Estado deve ter 2 caracteres')
    .regex(/^[A-Z]{2}$/, 'Estado deve ser uma sigla válida (ex: BA)'),
});