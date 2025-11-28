useEffect(() => {
  const loadInitialSession = async () => {
    console.log("AuthContext: Loading initial session...");
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      console.log("AuthContext: Initial session found:", session.user.id);
      setUser(session.user);
      setSession(session);
      await fetchUserProfileAndRole(session.user.id);
    } else {
      console.log("AuthContext: No initial session.");
      setUser(null);
      setSession(null);
    }

    setLoading(false); // Só libera depois do profile carregar
  };

  loadInitialSession(); // Carrega antes do listener

  console.log("AuthContext: Setting up auth state listener...");
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log("AuthContext: onAuthStateChange event:", event);

      if (session?.user) {
        setUser(session.user);
        setSession(session);
        await fetchUserProfileAndRole(session.user.id);
      } else {
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setActiveMunicipalityIdForSuperAdmin(null);
      }
    }
  );

  return () => {
    console.log('AuthContext: Unsubscribing...');
    subscription.unsubscribe();
  };
}, []);
