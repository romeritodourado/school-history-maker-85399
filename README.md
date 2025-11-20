# Sistema de Histórico Escolar

Sistema completo para criação, gerenciamento e exportação de históricos escolares do Ensino Fundamental.

## Funcionalidades

- Criação de históricos escolares completos
- Gerenciamento de alunos e seus dados
- Registro de notas por ano letivo e por trimestre
- Configuração de cargas horárias por disciplina e série
- Exportação em PDF e Excel
- Validação de autenticidade de históricos

## Tecnologias Utilizadas

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase (banco de dados e storage)
- jsPDF (geração de PDFs)
- XLSX (geração de Excel)

## Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd sistema-historico-escolar
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com as credenciais do Supabase
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
├── lib/                 # Funções utilitárias e lógica de negócio
├── pages/               # Páginas da aplicação
├── assets/              # Imagens e outros assets
├── integrations/        # Integrações com APIs externas
└── hooks/               # Hooks personalizados
```

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT.