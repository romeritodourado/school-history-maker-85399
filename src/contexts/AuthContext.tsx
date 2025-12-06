"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "../integrations/supabase/client";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // controla carregamento
  const [initialSessionChecked, setInitialSessionChecked] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // evita buscar perfil repetido
  const processingRef = useRef(false);

  // ---------- Busca perfil ----------
  const fetchProfile = async (userId: string) => {
    try {
      setAuthLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Erro buscando perfil:", error);
      }

      setProfile(data || null);
    } finally {
      setAuthLoading(false);
    }
  };

  // ---------- Processa sessão ----------
  const processSession = async (session) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(session.user);
      await fetchProfile(session.user.id);
    } finally {
      processingRef.current = false;
    }
  };

  // ---------- Listener do Supabase ----------
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Recupera sessão inicial
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      // Marca que já recebemos a sessão inicial
      if (mounted) {
        setInitialSessionChecked(true);
      }

      // Processa sessão já existente
      if (initialSession?.user) {
        processSession(initialSession);
      }
    };

    init();

    // Listener de eventos de autenticação
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth Event:", event);

        // Libera inicialização em QUALQUER evento
        if (!initialSessionChecked) {
          setInitialSessionChecked(true);
        }

        if (event === "SIGNED_IN") {
          await processSession(session);
        }

        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, initi
