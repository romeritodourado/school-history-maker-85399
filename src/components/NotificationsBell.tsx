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
    console.log("[NotificationsBell] fetchNotifications: Iniciando busca de notificações.");
    if (!user?.id || !profile?.school_id || (role !== 'school_admin' && role !== 'secretary')) {
      console.log("[NotificationsBell] fetchNotifications: Condições para buscar notificações não atendidas. User ID:", user?.id, "School ID:", profile?.school_id, "Role:", role);
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Adicionado logs de depuração
    console.log("[NotificationsBell] Debug: user.id =", user.id);
    console.log("[NotificationsBell] Debug: profile.school_id =", profile.school_id);

    setLoading(true);
    try {
      console.log(`[NotificationsBell] fetchNotifications: Buscando notificações para user_id: ${user.id}`);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[NotificationsBell] fetchNotifications: Erro do Supabase ao buscar notificações:', error);
        throw error;
      }

      console.log('[NotificationsBell] fetchNotifications: Notificações carregadas com sucesso:', data);
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error: any) {
      console.error('[NotificationsBell] fetchNotifications: Erro capturado no bloco catch:', error);
      toast({
        title: 'Erro ao carregar notificações',
        description: error.message || 'Não foi possível carregar suas notificações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      console.log("[NotificationsBell] fetchNotifications: Finalizando carregamento de notificações.");
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
          console.log('[NotificationsBell] Notification change received!', payload);
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
      console.log("[NotificationsBell] Desinscrevendo do canal de notificações.");
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.school_id, role, toast]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id);
      // Update local state immediately
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (notification.type === 'transcript_pending_signature') {
      navigate(`/assinar-historicos?schoolId=${profile?.school_id}`);
    }
  };

  // Only show the bell if the user is a school_admin or secretary
  if (role !== 'school_admin' && role !== 'secretary') {
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