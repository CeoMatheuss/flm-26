import { AdminTab } from "@/components/game/AdminTab";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AdminPage = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !session) {
      navigate("/auth");
      return;
    }

    const checkAdmin = async () => {
      if (!session?.user?.id) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    };

    if (session) {
      checkAdmin();
    }
  }, [session, loading, navigate]);

  if (loading || (session && isAdmin === null)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h1>
        <p className="text-muted-foreground mb-6">Você não tem permissão para acessar esta área.</p>
        <Button onClick={() => navigate("/")}>Voltar para o Início</Button>
      </div>
    );
  }

  const isFounder = session?.user?.email === 'footballlifemanager26@gmail.com' || 
                   session?.user?.id === '44ae41a8-4c3d-44af-af11-0e397a2ab1f4';

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Painel Administrativo</h1>
        </div>
        
        {session && <AdminTab userId={session.user.id} isFounder={isFounder} />}
      </div>
    </div>
  );
};

export default AdminPage;
