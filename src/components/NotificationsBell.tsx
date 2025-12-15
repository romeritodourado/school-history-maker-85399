import React, { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  message: string;
  read: boolean;
  target_id: string; // transcript_id
  type: string;
  created_at: string;
}

export function NotificationsBell() {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    // Apenas usuários de nível escolar (Diretor, Vice-Diretor, Secretário) devem ver notificações de assinatura
    const isSchoolLevelUser = ['school_admin', 'vice_school_admin', 'secretary'].includes(role || '');
    
    if (!user?.id || !profile?.school_id || !isSchoolLevelUser) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar notificações',
        description: error.message || 'Não foi possível carregar suas notificações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Listen for new notifications
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen for new inserts
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          // Add the new notification to the state and update unread count
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast({
            title: "Nova Notificação",
            description: newNotification.message,
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.school_id, role, toast]);

  const handleNotificationClick = async (notification: Notification) => {
    // 1. Marcar como lido no banco de dados
    if (!notification.read) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id);
        
      if (error) {
        console.error("Error marking notification as read:", error);
        toast({
          title: 'Erro',
          description: 'Não foi possível marcar a notificação como lida.',
          variant: 'destructive',
        });
        // Se falhar, não atualiza o estado local
        return;
      }
      
      // 2. Atualizar estado local imediatamente
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    // 3. Redirecionar
    if (notification.type === 'transcript_pending_signature' || notification.type === 'transcript_rejected') {
      // Redireciona para a página de assinatura, passando o schoolId
      navigate(`/assinar-historicos?schoolId=${profile?.school_id}`);
    }
  };

  // Apenas mostrar o sino se o usuário for de nível escolar (Diretor, Vice-Diretor, Secretário)
  const isSchoolLevelUser = ['school_admin', 'vice_school_admin', 'secretary'].includes(role || '');
  if (!isSchoolLevelUser) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Ver notificações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {loading ? (
          <DropdownMenuItem disabled className="flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
          </DropdownMenuItem>
        ) : notifications.length === 0 ? (
          <DropdownMenuItem disabled>Nenhuma notificação</DropdownMenuItem>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`flex flex-col items-start space-y-1 ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-950/50' : ''}`}
            >
              <span className="text-sm font-medium">{notification.message}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(notification.created_at).toLocaleString('pt-BR')}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}