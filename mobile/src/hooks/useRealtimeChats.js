import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import api from '../utils/api';
import { supabase } from '../utils/supabase';
import { decryptMessage } from '../utils/chatCrypto';
import { useAuth } from '../context/AuthContext';
import { useTabBar } from '../context/TabBarContext';

/**
 * Hook para gestionar las conversaciones de CokieChat en tiempo real.
 * Escucha los broadcasts de Supabase Realtime ('new_message', 'conversation_created')
 * y mantiene actualizados los mensajes recientes y el contador de la barra de pestañas.
 */
export function useRealtimeChats(initialConversations = []) {
  const { user } = useAuth();
  const { setUnreadChatCount } = useTabBar();
  const [conversations, setConversations] = useState(initialConversations);
  const [loading, setLoading] = useState(initialConversations.length === 0);
  const isMountedRef = useRef(true);

  const fetchConversations = useCallback(async (silent = false) => {
    if (!user?.id) return [];
    try {
      if (!silent) setLoading(true);
      const res = await api.get('/chat/conversations');
      const data = Array.isArray(res.data) ? res.data : [];
      
      const decryptedData = data.map(c => ({
        ...c,
        last_message: decryptMessage(c.last_message)
      }));

      if (isMountedRef.current) {
        setConversations(decryptedData);
        if (setUnreadChatCount) {
          const total = decryptedData.reduce((sum, c) => sum + (c.unread_count || 0), 0);
          setUnreadChatCount(total);
        }
      }
      return decryptedData;
    } catch (err) {
      console.warn('[useRealtimeChats] Error fetching conversations:', err?.message);
      return [];
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.id, setUnreadChatCount]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!user?.id) return;

    fetchConversations(false);

    // Canal WebSocket en tiempo real de Supabase exclusivo para el usuario
    const channelName = `user_chat_${user.id}`;
    const userChannel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        if (!payload || !payload.conversation_id) return;
        const clearContent = decryptMessage(payload.content);
        const isMine = payload.sender_id === user.id;

        setConversations(prev => {
          let exists = false;
          const updated = prev.map(c => {
            if (c.id === payload.conversation_id) {
              exists = true;
              const newUnread = (c.unread_count || 0) + (isMine ? 0 : 1);
              return {
                ...c,
                last_message: payload.type === 'image'
                  ? '📷 Foto enviada'
                  : (payload.type === 'document' ? `📄 ${payload.attachment_name || 'Documento'}` : clearContent),
                last_message_at: payload.created_at || new Date().toISOString(),
                unread_count: newUnread
              };
            }
            return c;
          });

          if (!exists) {
            // Conversación nueva: refrescar lista completa desde el backend
            fetchConversations(true);
            return prev;
          }

          // Reordenar colocando el chat más reciente en la cima
          updated.sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());

          if (setUnreadChatCount) {
            const total = updated.reduce((sum, c) => sum + (c.unread_count || 0), 0);
            setUnreadChatCount(total);
          }

          return updated;
        });
      })
      .on('broadcast', { event: 'conversation_created' }, () => {
        fetchConversations(true);
      })
      .subscribe();

    // Sincronización periódica cada 25 segundos para garantizar consistencia
    const interval = setInterval(() => {
      fetchConversations(true);
    }, 25000);

    // Sincronizar inmediatamente al volver a primer plano
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        fetchConversations(true);
      }
    });

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      appStateSub?.remove?.();
      supabase.removeChannel(userChannel);
    };
  }, [user?.id, fetchConversations, setUnreadChatCount]);

  return {
    conversations,
    setConversations,
    loading,
    refetch: fetchConversations
  };
}

export default useRealtimeChats;
