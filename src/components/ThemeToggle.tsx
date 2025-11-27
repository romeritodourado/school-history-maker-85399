"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme(); // Obter o tema atual para depuração
  
  React.useEffect(() => {
    console.log("ThemeToggle montado. Tema atual:", theme);
    console.log("Função setTheme:", setTheme);
  }, [theme, setTheme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => { console.log("Definindo tema para light"); setTheme("light"); }}>
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { console.log("Definindo tema para dark"); setTheme("dark"); }}>
          Escuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { console.log("Definindo tema para system"); setTheme("system"); }}>
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}