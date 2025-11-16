# AI Rules and Project Guidelines

This document outlines the core technologies and libraries used in this project, along with guidelines for their appropriate use.

## Tech Stack Overview

*   **Framework:** React (with Vite for fast development)
*   **Language:** TypeScript
*   **UI Components:** shadcn/ui (built on Radix UI)
*   **Styling:** Tailwind CSS
*   **Routing:** React Router DOM
*   **Backend/Database/Authentication:** Supabase
*   **Data Fetching/State Management:** React Query
*   **Form Management:** React Hook Form
*   **Validation:** Zod
*   **Icons:** Lucide React
*   **Notifications:** Sonner (for toasts)
*   **PDF Generation:** jsPDF and jspdf-autotable
*   **Excel Generation:** XLSX

## Library Usage Rules

To maintain consistency and efficiency, please adhere to the following guidelines when implementing new features or modifying existing code:

*   **UI Components:** Always prioritize `shadcn/ui` components for building user interfaces. If a specific component is not available, create a new, small, and focused component in `src/components/` using Tailwind CSS for styling. Do not modify existing `shadcn/ui` component files directly.
*   **Styling:** Use `Tailwind CSS` classes exclusively for all styling. Avoid inline styles or separate CSS files unless absolutely necessary for global styles (e.g., `src/index.css`). Ensure designs are responsive.
*   **Routing:** Use `react-router-dom` for all navigation within the application. Keep route definitions centralized in `src/App.tsx`.
*   **Backend Interactions:** All database, authentication, and server-side logic should be handled via `Supabase`. Use the provided `supabase` client from `src/integrations/supabase/client.ts`.
*   **Data Fetching:** For managing server state and data fetching, use `@tanstack/react-query`.
*   **Form Handling:** Implement forms using `react-hook-form` for robust validation and state management.
*   **Validation:** Use `Zod` for defining and validating all data schemas, especially for form inputs and API payloads.
*   **Icons:** Utilize icons from the `lucide-react` library.
*   **Notifications:** For user feedback and notifications, use the `sonner` library for toasts.
*   **PDF Generation:** For generating PDF documents, use `jspdf` and `jspdf-autotable`.
*   **Excel Generation:** For generating Excel files, use the `xlsx` library.
*   **Date Manipulation:** Use `date-fns` for any date formatting or manipulation tasks.
*   **Component Structure:** Create a new, dedicated file for every new component or hook in `src/components/` or `src/hooks/` respectively. Aim for components to be concise (ideally under 100 lines of code).
*   **Error Handling:** Do not use `try/catch` blocks for API calls unless specifically requested. Let errors bubble up to be handled by global error boundaries or React Query's error handling mechanisms.