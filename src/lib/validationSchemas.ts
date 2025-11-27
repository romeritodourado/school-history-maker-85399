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

// User signup validation schema
export const signupSchema = z.object({
  email: z.string()
    .trim()
    .email('Email inválido')
    .max(255, 'Email deve ter no máximo 255 caracteres'),
  
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(72, 'Senha deve ter no máximo 72 caracteres')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  
  name: z.string()
    .trim()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),
});

// Login validation schema
export const loginSchema = z.object({
  email: z.string()
    .trim()
    .email('Email inválido')
    .max(255, 'Email deve ter no máximo 255 caracteres'),
  
  password: z.string()
    .min(1, 'Senha é obrigatória'),
});

// School validation schema
export const schoolSchema = z.object({
  name: z.string()
    .trim()
    .min(3, 'Nome da escola deve ter pelo menos 3 caracteres')
    .max(200, 'Nome da escola deve ter no máximo 200 caracteres'),
  
  inep: z.string() // Changed from inep_code to inep
    .trim()
    .regex(/^\d{8}$/, 'Código INEP deve ter 8 dígitos')
    .optional()
    .or(z.literal('')),
  
  address: z.string()
    .trim()
    .max(200, 'Endereço deve ter no máximo 200 caracteres')
    .optional()
    .or(z.literal('')),
  
  city: z.string() // Adicionado
    .trim()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(100, 'Cidade deve ter no máximo 100 caracteres')
    .optional()
    .or(z.literal('')),
  
  state: z.string() // Adicionado
    .length(2, 'Estado deve ter 2 caracteres')
    .regex(/^[A-Z]{2}$/, 'Estado deve ser uma sigla válida (ex: BA)')
    .optional()
    .or(z.literal('')),
  
  logo_url: z.string()
    .url('URL da logo inválida')
    .max(500, 'URL da logo deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  
  // Alterado para string simples, não URL
  authorization_decree_url: z.string()
    .max(500, 'Decreto de autorização deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  
  // Alterado para string simples, não URL
  official_gazette_url: z.string()
    .max(500, 'Diário oficial deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
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

// Municipality validation schema
export const municipalitySchema = z.object({
  name: z.string()
    .trim()
    .min(3, 'Nome da rede municipal deve ter pelo menos 3 caracteres')
    .max(200, 'Nome da rede municipal deve ter no máximo 200 caracteres'),
  
  cnpj: z.string()
    .trim()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido (formato: 00.000.000/0001-00)')
    .optional()
    .or(z.literal('')),
  
  emblem_url: z.string()
    .url('URL do brasão inválida')
    .max(500, 'URL do brasão deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  
  address: z.string() // Novo campo de endereço
    .trim()
    .max(200, 'Endereço deve ter no máximo 200 caracteres')
    .optional()
    .or(z.literal('')),
  
  city: z.string() // Adicionado
    .trim()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(100, 'Cidade deve ter no máximo 100 caracteres'),
  
  state: z.string() // Adicionado
    .length(2, 'Estado deve ter 2 caracteres')
    .regex(/^[A-Z]{2}$/, 'Estado deve ser uma sigla válida (ex: BA)'),
});

// Password change schema
export const passwordChangeSchema = z.object({
  newPassword: z.string()
    .min(8, 'A nova senha deve ter pelo menos 8 caracteres')
    .max(72, 'A nova senha deve ter no máximo 72 caracteres')
    .regex(/[a-z]/, 'A nova senha deve conter pelo menos uma letra minúscula')
    .regex(/[A-Z]/, 'A nova senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'A nova senha deve conter pelo menos um número'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});