import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  useWindowDimensions,
  StatusBar,
  Keyboard,
  BackHandler
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Plus,
  ArrowLeft,
  Paperclip,
  Send,
  Image as ImageIcon,
  FileText,
  Camera,
  X,
  Download,
  Users,
  Check,
  CheckCheck,
  Clock,
  CheckSquare,
  Square,
  Smile,
  MoreVertical,
  Circle
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { useAlert } from '../src/context/AlertContext';
import { supabase } from '../src/utils/supabase';
import api from '../src/utils/api';
import { encryptMessage, decryptMessage } from '../src/utils/chatCrypto';
import { enqueueOutbox, subscribeOutbox, startOutboxAutoFlush } from '../src/utils/outboxQueue';
import PageHeader from '../src/components/PageHeader';
import BottomModal from '../src/components/BottomModal';

export default function ChatScreen() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors: Colors, theme } = useTheme();
  const { showAlert } = useAlert();

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Estados de Conversaciones
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeConv, setActiveConv] = useState(null);

  // Estados de Mensajes
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [activeParticipants, setActiveParticipants] = useState([]);
  const flatListRef = useRef(null);

  // Modales
  const [newChatModalVisible, setNewChatModalVisible] = useState(false);
  const [newChatTab, setNewChatTab] = useState('direct'); // 'direct' | 'group'
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Creación de Grupo
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Adjuntos
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Escuchar teclado para scroll y ajustes de padding
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Botón físico atrás en Android
  useEffect(() => {
    const onBackPress = () => {
      if (previewImage) {
        setPreviewImage(null);
        return true;
      }
      if (attachmentModalVisible) {
        setAttachmentModalVisible(false);
        return true;
      }
      if (newChatModalVisible) {
        setNewChatModalVisible(false);
        return true;
      }
      if (activeConv) {
        setAttachmentModalVisible(false);
        setActiveConv(null);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [activeConv, attachmentModalVisible, newChatModalVisible, previewImage]);

  // Cerrar modales automáticamente cuando se sale de una conversación o cambia la conversación activa
  useEffect(() => {
    if (!activeConv) {
      setAttachmentModalVisible(false);
      setPreviewImage(null);
    }
  }, [activeConv]);

  const styles = useMemo(() => createStyles(Colors, theme, isDesktop), [Colors, theme, isDesktop]);

  const filterTabs = useMemo(() => [
    { id: 'all', label: t('chat.all', 'Todos') },
    { id: 'teacher', label: t('chat.teachers', 'Docentes') },
    { id: 'student', label: t('chat.students', 'Estudiantes') },
    { id: 'coordinator', label: t('chat.coordinator', 'Coordinador') },
    { id: 'group', label: t('chat.groups', 'Grupos') }
  ], [t]);

  // Helper para determinar si un mensaje fue leído por el destinatario (Doble Check Azul)
  const isReadByRecipient = (msg) => {
    if (!msg || !msg.created_at) return false;
    if (msg.status === 'pending') return false;
    const otherPart = activeParticipants.find(p => p.user_id !== user?.id);
    if (!otherPart || !otherPart.last_read_at) return false;
    return new Date(otherPart.last_read_at).getTime() >= new Date(msg.created_at).getTime();
  };

  // 1. Cargar Conversaciones
  const fetchConversations = async (silent = false) => {
    try {
      if (!silent) setLoadingConversations(true);
      const res = await api.get('/chat/conversations');
      const data = Array.isArray(res.data) ? res.data : [];
      const decryptedData = data.map(c => ({
        ...c,
        last_message: decryptMessage(c.last_message)
      }));
      setConversations(decryptedData);

      // Si estamos en escritorio y no hay activa, seleccionar la primera
      if (isDesktop && !activeConv && decryptedData.length > 0) {
        setActiveConv(decryptedData[0]);
      }
    } catch (err) {
      console.warn('Error fetching conversations from backend, trying direct Supabase fallback:', err.message);
      await fetchConversationsFallback();
    } finally {
      setLoadingConversations(false);
    }
  };

  // Fallback directo a Supabase en caso de que la ruta local aún no se haya desplegado a Vercel
  const fetchConversationsFallback = async () => {
    if (!user) return;
    try {
      const { data: parts, error: pErr } = await supabase
        .from('conversation_participants')
        .select('conversation_id, role, last_read_at, conversations(*)')
        .eq('user_id', user.id);

      if (pErr) return;
      if (!parts || parts.length === 0) {
        setConversations([]);
        return;
      }

      const convList = parts.map(p => p.conversations).filter(Boolean);
      const formatted = convList.map(c => ({
        id: c.id,
        type: c.type,
        title: c.name || 'Chat Institucional',
        name: c.name,
        avatar_url: c.avatar_url,
        last_message: 'Mensajes seguros',
        last_message_at: c.last_message_at || c.created_at,
        unread_count: 0,
        is_group: c.type === 'group'
      }));
      setConversations(formatted);
      if (isDesktop && !activeConv && formatted.length > 0) {
        setActiveConv(formatted[0]);
      }
    } catch (e) {
      console.error('Fallback failed:', e);
    }
  };

  // 2. Cargar Mensajes de la conversación activa
  const fetchMessages = async (convId) => {
    if (!convId) return;
    try {
      setLoadingMessages(true);
      const res = await api.get(`/chat/conversations/${convId}/messages`);
      const list = res.data?.messages || [];
      const parts = res.data?.participants || [];
      setActiveParticipants(parts);
      setMessages(list.map(m => ({
        ...m,
        content: decryptMessage(m.content),
        status: 'sent'
      })));

      // Limpiar conteo no leído de esta conversación en el estado local
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c));

      // Marcar como leída de inmediato
      api.post(`/chat/conversations/${convId}/read`).catch(() => {});
    } catch (err) {
      console.warn('Error fetching messages from backend, trying direct Supabase:', err.message);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
      if (!error && data) {
        setMessages(data.map(m => ({
          ...m,
          content: decryptMessage(m.content),
          is_mine: m.sender_id === user?.id,
          status: 'sent'
        })));
      }
    } finally {
      setLoadingMessages(false);
    }
  };

  // Inicialización y Polling/Listener
  useEffect(() => {
    fetchConversations();
  }, [user]);

  // Vigilancia de la cola de salida (Outbox Offline Queue)
  useEffect(() => {
    const stopAutoFlush = startOutboxAutoFlush(api, 12000);
    const unsubscribeOutbox = subscribeOutbox(({ type, tempId, realData }) => {
      if (type === 'sent' && realData) {
        setMessages(prev => prev.map(m => m.id === tempId ? {
          ...m,
          id: realData.id,
          status: 'sent',
          created_at: realData.created_at || m.created_at
        } : m));
      }
    });

    return () => {
      stopAutoFlush();
      unsubscribeOutbox();
    };
  }, []);

  useEffect(() => {
    if (activeConv?.id) {
      fetchMessages(activeConv.id);
    } else {
      setMessages([]);
      setActiveParticipants([]);
    }
  }, [activeConv?.id]);

  // 3. Suscripción en Tiempo Real mediante Supabase Realtime (Mensajes y Lectura)
  useEffect(() => {
    if (!activeConv?.id) return;

    const channel = supabase
      .channel(`chat_room_${activeConv.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConv.id}`
        },
        async (payload) => {
          const newMsg = payload.new;
          const isMine = newMsg.sender_id === user?.id;
          const clearContent = decryptMessage(newMsg.content);

          // Si el mensaje es entrante y la pantalla está activa, marcarlo leído
          if (!isMine) {
            api.post(`/chat/conversations/${activeConv.id}/read`).catch(() => {});
          }

          // Obtener nombre del remitente si es de otro usuario
          let senderProfile = null;
          if (!isMine && newMsg.sender_id) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('id, full_name, role')
              .eq('id', newMsg.sender_id)
              .single();
            senderProfile = prof;
          }

          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [
              ...prev,
              {
                ...newMsg,
                content: clearContent,
                is_mine: isMine,
                status: 'sent',
                sender: senderProfile || { full_name: isMine ? (profile?.full_name || 'Yo') : 'Usuario' }
              }
            ];
          });

          // Actualizar lista de conversaciones
          setConversations(prev => prev.map(c => {
            if (c.id === activeConv.id) {
              return {
                ...c,
                last_message: newMsg.type === 'image' 
                  ? t('chat.attachedPhoto', '📷 Foto enviada') 
                  : (newMsg.type === 'document' ? `📄 ${newMsg.attachment_name || 'Documento'}` : clearContent),
                last_message_at: newMsg.created_at
              };
            }
            return c;
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `conversation_id=eq.${activeConv.id}`
        },
        (payload) => {
          const updated = payload.new;
          setActiveParticipants(prev => {
            const exists = prev.some(p => p.user_id === updated.user_id);
            if (!exists) return [...prev, updated];
            return prev.map(p => p.user_id === updated.user_id ? { ...p, last_read_at: updated.last_read_at } : p);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv?.id, user?.id, profile?.full_name]);

  // 4. Enviar Mensaje (Con cifrado AES y cola Offline)
  const handleSendMessage = async (attachmentData = null) => {
    if (!activeConv?.id) return;
    const textToSend = messageText.trim();
    if (!textToSend && !attachmentData) return;

    setSending(true);
    const encryptedContent = textToSend ? encryptMessage(textToSend) : null;
    const payload = {
      content: encryptedContent,
      type: attachmentData?.type || 'text',
      attachment_url: attachmentData?.url || null,
      attachment_name: attachmentData?.name || null,
      attachment_size: attachmentData?.size || null
    };

    try {
      const res = await api.post(`/chat/conversations/${activeConv.id}/messages`, payload);
      setMessageText('');

      // Agregar inmediatamente a la lista si no vino ya por Realtime
      if (res.data) {
        setMessages(prev => {
          if (prev.some(m => m.id === res.data.id)) return prev;
          return [...prev, { ...res.data, content: textToSend, is_mine: true, status: 'sent' }];
        });
      }

      // Actualizar timestamp en la lista de conversaciones
      setConversations(prev => prev.map(c => {
        if (c.id === activeConv.id) {
          return {
            ...c,
            last_message: payload.type === 'image' 
              ? t('chat.attachedPhoto', '📷 Foto enviada') 
              : (payload.type === 'document' 
                  ? t('chat.attachedDocument', { name: payload.attachment_name, defaultValue: `📄 ${payload.attachment_name}` }) 
                  : textToSend),
            last_message_at: new Date().toISOString()
          };
        }
        return c;
      }));
    } catch (err) {
      console.warn('Network issue sending message, queuing in offline outbox:', err.message);
      const isNetworkError = !err.response || err.code === 'ECONNABORTED' || err.message?.includes('Network Error');
      if (isNetworkError) {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const localPendingMsg = {
          id: tempId,
          conversation_id: activeConv.id,
          sender_id: user?.id,
          content: textToSend,
          type: payload.type,
          attachment_url: payload.attachment_url,
          attachment_name: payload.attachment_name,
          attachment_size: payload.attachment_size,
          created_at: new Date().toISOString(),
          is_mine: true,
          status: 'pending',
          sender: { full_name: profile?.full_name || 'Yo' }
        };
        setMessages(prev => [...prev, localPendingMsg]);
        setMessageText('');

        await enqueueOutbox({
          type: 'message',
          endpoint: `/chat/conversations/${activeConv.id}/messages`,
          payload,
          tempId
        });
      } else {
        showAlert({
          type: 'error',
          title: t('chat.alerts.sendErrorTitle', 'Error de Envío'),
          message: t('chat.alerts.sendErrorMessage', 'No se pudo entregar el mensaje. Verifica tu conexión.')
        });
      }
    } finally {
      setSending(false);
    }
  };

  // 5. Cargar usuarios para nuevo chat o grupo
  const fetchUsersForChat = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get('/chat/users', {
        params: { search: userSearch || undefined, role: userRoleFilter === 'all' ? undefined : userRoleFilter }
      });
      setUsersList(res.data || []);
    } catch (err) {
      // Fallback a Supabase profiles
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role, institutional_code, grade, section, level')
        .eq('is_active', true)
        .neq('id', user?.id || '')
        .limit(50);
      setUsersList(data || []);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (newChatModalVisible) {
      fetchUsersForChat();
    }
  }, [newChatModalVisible, userSearch, userRoleFilter]);

  // Iniciar chat 1 a 1
  const startDirectChat = async (targetUser) => {
    try {
      const res = await api.post('/chat/conversations', {
        type: 'direct',
        recipient_id: targetUser.id
      });
      setNewChatModalVisible(false);
      await fetchConversations(true);

      const convId = res.data?.id;
      if (convId) {
        const found = conversations.find(c => c.id === convId);
        if (found) {
          setActiveConv(found);
        } else {
          setActiveConv({
            id: convId,
            type: 'direct',
            title: targetUser.full_name,
            recipient: targetUser,
            recipient_role: targetUser.role
          });
        }
      }
    } catch (err) {
      console.error('Error creating direct chat:', err);
      showAlert({ type: 'error', title: t('common.error', 'Error'), message: t('chat.alerts.directChatError', 'No se pudo iniciar la conversación.') });
    }
  };

  // Crear grupo
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      showAlert({ type: 'warning', title: t('common.warning', 'Atención'), message: t('chat.alerts.writeGroupName', 'Escribe un nombre para el grupo.') });
      return;
    }
    if (selectedGroupMembers.length === 0) {
      showAlert({ type: 'warning', title: t('common.warning', 'Atención'), message: t('chat.alerts.selectGroupMembers', 'Selecciona al menos un integrante para el grupo.') });
      return;
    }

    setCreatingGroup(true);
    try {
      const res = await api.post('/chat/conversations', {
        type: 'group',
        name: groupName.trim(),
        participant_ids: selectedGroupMembers.map(m => m.id)
      });
      setNewChatModalVisible(false);
      setGroupName('');
      setSelectedGroupMembers([]);
      await fetchConversations(true);

      const convId = res.data?.id;
      if (convId) {
        setActiveConv({
          id: convId,
          type: 'group',
          name: groupName.trim(),
          title: groupName.trim(),
          is_group: true
        });
      }
      showAlert({ type: 'success', title: t('chat.createGroup', 'Grupo Creado'), message: t('chat.alerts.groupCreatedSuccess', { name: groupName, defaultValue: `El grupo "${groupName}" ha sido creado con éxito.` }) });
    } catch (err) {
      console.error('Error creating group:', err);
      showAlert({ type: 'error', title: t('common.error', 'Error'), message: t('chat.alerts.groupCreatedError', 'No se pudo crear el grupo.') });
    } finally {
      setCreatingGroup(false);
    }
  };

  // Adjuntar Imagen desde Galería o Cámara
  const pickImage = async (useCamera = false) => {
    setAttachmentModalVisible(false);
    try {
      let result;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          showAlert({ type: 'warning', title: t('common.warning', 'Permiso Requerido'), message: t('chat.alerts.permissionCamera', 'Se necesita permiso para usar la cámara.') });
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          base64: true,
          quality: 0.7,
          allowsEditing: true
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showAlert({ type: 'warning', title: t('common.warning', 'Permiso Requerido'), message: t('chat.alerts.permissionGallery', 'Se necesita permiso para acceder a la galería.') });
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          base64: true,
          quality: 0.7,
          allowsEditing: true
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingAttachment(true);

        const filename = asset.fileName || `foto_${Date.now()}.jpg`;

        // 🚀 COMPRESIÓN DE IMAGEN CON expo-image-manipulator
        // Redimensionar a un ancho máximo de 1080px y comprimir a calidad 0.7 en JPEG
        let base64Data = null;
        let compressedSize = asset.fileSize || 0;
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1080 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          if (manipulated) {
            base64Data = manipulated.base64 ? `data:image/jpeg;base64,${manipulated.base64}` : manipulated.uri;
            if (manipulated.base64) {
              compressedSize = Math.round((manipulated.base64.length * 3) / 4);
            }
          }
        } catch (manipError) {
          console.warn('Compresión omitida o fallida, usando original:', manipError.message);
          base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        }

        if (!base64Data) {
          base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        }

        // Subir al backend o usar URI directa
        const uploadRes = await api.post('/chat/upload', {
          base64: base64Data,
          filename,
          mimeType: 'image/jpeg'
        }).catch(() => ({ data: { url: base64Data, filename } }));

        const finalUrl = uploadRes.data?.url || base64Data;
        await handleSendMessage({
          type: 'image',
          url: finalUrl,
          name: filename,
          size: compressedSize
        });
      }
    } catch (err) {
      console.error('Error picking image:', err);
      showAlert({ type: 'error', title: t('common.error', 'Error'), message: t('chat.alerts.imageProcessError', 'No se pudo procesar la imagen seleccionada.') });
    } finally {
      setUploadingAttachment(false);
    }
  };

  // Adjuntar Documento (PDF, Word, etc.)
  const pickDocument = async () => {
    setAttachmentModalVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setUploadingAttachment(true);

        let base64String = null;
        if (file.uri && Platform.OS !== 'web') {
          base64String = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64
          });
        }

        const base64Data = base64String 
          ? `data:${file.mimeType || 'application/octet-stream'};base64,${base64String}` 
          : file.uri;

        const uploadRes = await api.post('/chat/upload', {
          base64: base64Data,
          filename: file.name,
          mimeType: file.mimeType
        }).catch(() => ({ data: { url: base64Data, filename: file.name } }));

        const finalUrl = uploadRes.data?.url || base64Data;
        await handleSendMessage({
          type: 'document',
          url: finalUrl,
          name: file.name,
          size: file.size || 0
        });
      }
    } catch (err) {
      console.error('Error picking document:', err);
      showAlert({ type: 'error', title: t('common.error', 'Error'), message: t('chat.alerts.docAttachError', 'No se pudo adjuntar el documento.') });
    } finally {
      setUploadingAttachment(false);
    }
  };

  // Descargar / Abrir documento
  const openDocument = async (docUrl, docName) => {
    try {
      if (Platform.OS === 'web') {
        window.open(docUrl, '_blank');
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        if (docUrl.startsWith('data:')) {
          const b64 = docUrl.split('base64,')[1];
          const path = `${FileSystem.cacheDirectory}${docName || 'archivo'}`;
          await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
          await Sharing.shareAsync(path);
        } else {
          Linking.openURL(docUrl);
        }
      } else {
        Linking.openURL(docUrl);
      }
    } catch (err) {
      console.error('Error opening doc:', err);
      showAlert({ type: 'error', title: t('common.error', 'Error'), message: t('chat.alerts.docOpenError', 'No se pudo abrir el documento adjunto.') });
    }
  };

  // Filtrar conversaciones de la lista
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const matchesSearch = !searchQuery ||
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.last_message?.toLowerCase().includes(searchQuery.toLowerCase());

      if (selectedFilter === 'all') return matchesSearch;
      if (selectedFilter === 'group') return matchesSearch && c.is_group;
      return matchesSearch && !c.is_group && (c.recipient_role === selectedFilter || c.role === selectedFilter);
    });
  }, [conversations, searchQuery, selectedFilter]);

  // Formateador de fechas para separadores y burbujas
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isDark = theme === 'dark';

  const getRoleBadgeInfo = (role) => {
    switch (role) {
      case 'teacher':
        return { label: t('chat.roles.teacher', 'DOCENTE'), bg: isDark ? 'rgba(168, 85, 247, 0.2)' : '#f3e8ff', text: isDark ? '#c084fc' : '#7c3aed' };
      case 'coordinator':
        return { label: t('chat.roles.coordinator', 'COORDINADOR'), bg: isDark ? 'rgba(147, 51, 234, 0.2)' : '#ede9fe', text: isDark ? '#d8b4fe' : '#6d28d9' };
      case 'student':
        return { label: t('chat.roles.student', 'ESTUDIANTE'), bg: isDark ? 'rgba(14, 165, 233, 0.2)' : '#e0f2fe', text: isDark ? '#38bdf8' : '#0284c7' };
      case 'super_admin':
        return { label: t('chat.roles.admin', 'ADMIN'), bg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', text: isDark ? '#f87171' : '#dc2626' };
      case 'group':
        return { label: t('chat.roles.group', 'GRUPO'), bg: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7', text: isDark ? '#4ade80' : '#15803d' };
      default:
        return { label: t('chat.roles.institutional', 'INSTITUCIONAL'), bg: isDark ? 'rgba(148, 163, 184, 0.2)' : '#f1f5f9', text: isDark ? '#94a3b8' : '#475569' };
    }
  };

  // ==========================================
  // COMPONENTE: LISTA DE CONVERSACIONES
  // ==========================================
  const renderConversationList = () => (
    <View style={styles.convListContainer}>
      {/* Cabecera de Mensajes */}
      <View style={styles.convListHeader}>
        <View style={styles.convListHeaderTop}>
          <Text style={styles.convListTitle}>{t('chat.title', 'Mensajes')}</Text>
          <TouchableOpacity
            style={styles.plusBtn}
            onPress={() => setNewChatModalVisible(true)}
            activeOpacity={0.8}
          >
            <Plus size={20} color={isDark ? '#FFF' : '#0B1956'} />
          </TouchableOpacity>
        </View>

        {/* Buscador dentro del Header */}
        <View style={styles.convSearchBox}>
          <Search size={18} color={isDark ? Colors.text.muted : '#94a3b8'} />
          <TextInput
            style={styles.convSearchInput}
            placeholder={isDesktop ? t('chat.searchConversation', 'Buscar conversación...') : t('chat.searchContactsOrMessages', 'Buscar contactos o mensajes...')}
            placeholderTextColor={isDark ? Colors.text.muted : '#94a3b8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={isDark ? Colors.text.muted : '#94a3b8'} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Pestañas de Filtro */}
      <View style={styles.filterTabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsScroll}>
          {filterTabs.map(tab => {
            const isActive = selectedFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setSelectedFilter(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Listado de Chats */}
      {loadingConversations ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('chat.loadingConversations', 'Cargando mensajes...')}</Text>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyConvState}>
          <Users size={36} color={Colors.text.muted} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyConvTitle}>{t('chat.noConversations', 'Sin conversaciones')}</Text>
          <Text style={styles.emptyConvSubtitle}>
            {searchQuery ? t('chat.noResultsSearch', 'No hay resultados para tu búsqueda') : t('chat.noConversationsHint', 'Presiona el botón (+) para iniciar un nuevo chat o grupo')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = activeConv?.id === item.id;
            const badge = getRoleBadgeInfo(item.is_group ? 'group' : item.recipient_role);
            return (
              <TouchableOpacity
                style={[styles.convItem, isSelected && styles.convItemActive]}
                onPress={() => setActiveConv(item)}
                activeOpacity={0.7}
              >
                {/* Avatar con Punto de Conexión Verde */}
                <View style={styles.avatarWrapper}>
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, item.is_group && { backgroundColor: '#10b981' }]}>
                      {item.is_group ? (
                        <Users size={20} color="#FFF" />
                      ) : (
                        <Text style={styles.avatarInitial}>
                          {(item.title || 'U').charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                  )}
                  <View style={styles.onlineDot} />
                </View>

                {/* Contenido Central */}
                <View style={styles.convDetails}>
                  <View style={styles.convDetailsTop}>
                    <Text style={[styles.convTitle, isSelected && styles.convTitleActive]} numberOfLines={1} ellipsizeMode="tail">
                      {item.title}
                    </Text>
                    <Text style={styles.convTime}>
                      {formatTime(item.last_message_at)}
                    </Text>
                  </View>

                  <View style={styles.convDetailsBottom}>
                    <View style={styles.badgeAndMsgRow}>
                      <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                      <Text style={[styles.convLastMsg, isSelected && { color: Colors.text.primary }]} numberOfLines={1} ellipsizeMode="tail">
                        {item.last_message}
                      </Text>
                    </View>
                    {item.unread_count > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );

  // ==========================================
  // COMPONENTE: VISTA DE CONVERSACIÓN / MENSAJES
  // ==========================================
  const renderChatPane = () => {
    if (!activeConv) {
      return (
        <View style={styles.noChatSelectedContainer}>
          <View style={styles.noChatIconCircle}>
            <Users size={44} color={Colors.primary} />
          </View>
          <Text style={styles.noChatTitle}>{t('chat.chatPlaceholderTitle', 'CokieChat Institucional')}</Text>
          <Text style={styles.noChatSubtitle}>
            {t('chat.chatPlaceholderSubtitle', 'Selecciona una conversación a la izquierda o inicia un nuevo chat con tus profesores o compañeros.')}
          </Text>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + (isDesktop ? 60 : 44) : 0}
      >
        <View style={styles.chatPaneContainer}>
          {/* Cabecera del Chat Activo: Específica para Desktop y Móvil */}
          {isDesktop ? (
            <View style={styles.chatHeaderDesktop}>
              <View style={styles.desktopHeaderAvatarWrapper}>
                {activeConv.avatar_url ? (
                  <Image source={{ uri: activeConv.avatar_url }} style={styles.desktopHeaderAvatarImg} />
                ) : (
                  <View style={styles.desktopHeaderAvatarPlaceholder}>
                    <Text style={styles.desktopHeaderAvatarInitial}>
                      {(activeConv.title || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.desktopOnlineDot} />
              </View>

              <View style={styles.desktopHeaderInfo}>
                <Text style={styles.desktopHeaderName} numberOfLines={1}>
                  {activeConv.title || activeConv.name}
                </Text>
                <Text style={styles.desktopHeaderStatus}>
                  {activeConv.is_group 
                    ? t('chat.participantsCount', { count: activeConv.participants_count || '', defaultValue: `${activeConv.participants_count || 'Varios'} participantes` }) 
                    : (activeConv.recipient_level || (activeConv.recipient_role === 'coordinator' ? t('chat.roles.coordinator', 'Coordinadora Académica') : (activeConv.recipient_role === 'teacher' ? t('chat.roles.teacher', 'Docente') : t('chat.roles.student', 'Estudiante'))))}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.chatHeaderMobile}>
              <View style={styles.headerAvatarContainerLeft}>
                {activeConv.avatar_url ? (
                  <Image source={{ uri: activeConv.avatar_url }} style={styles.headerAvatarImg} />
                ) : (
                  <View style={styles.headerAvatarPlaceholder}>
                    <Text style={styles.headerAvatarInitial}>
                      {(activeConv.title || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.chatHeaderInfo}>
                <Text style={styles.chatHeaderName} numberOfLines={1}>
                  {activeConv.title || activeConv.name}
                </Text>
                <Text style={styles.chatHeaderStatus}>
                  {activeConv.is_group 
                    ? t('chat.participantsCount', { count: activeConv.participants_count || '', defaultValue: `${activeConv.participants_count || 'Varios'} participantes` }) 
                    : t('chat.online', 'En linea')}
                </Text>
              </View>
            </View>
          )}

          {/* Cuerpo Blanco con Esquinas Redondeadas y Mensajes */}
          <View style={styles.chatBodyCard}>
            {loadingMessages ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>{t('chat.loadingMessages', 'Cargando mensajes seguros...')}</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id || String(Math.random())}
                contentContainerStyle={styles.messagesListContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListHeaderComponent={() => (
                <View style={styles.dateSeparatorWrapper}>
                  <Text style={styles.dateSeparatorText}>
                    {isDesktop
                      ? t('chat.todayFull', {
                          date: new Date().toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(),
                          defaultValue: `HOY · ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}`
                        })
                      : t('chat.today', 'HOY')}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => {
                const isMine = item.is_mine || item.sender_id === user?.id;
                return (
                  <View style={[styles.messageRow, isMine ? styles.messageRowRight : styles.messageRowLeft]}>
                    {/* Avatar en mensajes entrantes */}
                    {!isMine && (
                      <View style={styles.messageAvatar}>
                        <Text style={styles.messageAvatarInitial}>
                          {(item.sender?.full_name || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View style={[
                      styles.messageBubble, 
                      isMine ? styles.bubbleOutgoing : styles.bubbleIncoming
                    ]}>
                      {/* Remitente si es grupo */}
                      {activeConv.is_group && !isMine && item.sender && (
                        <Text style={styles.groupSenderName}>{item.sender.full_name}</Text>
                      )}

                      {/* Imagen Adjunta */}
                      {item.type === 'image' && item.attachment_url && (
                        <TouchableOpacity onPress={() => setPreviewImage(item.attachment_url)} activeOpacity={0.9}>
                          <Image source={{ uri: item.attachment_url }} style={styles.bubbleImage} resizeMode="cover" />
                        </TouchableOpacity>
                      )}

                      {/* Documento Adjunto */}
                      {item.type === 'document' && item.attachment_url && (
                        <TouchableOpacity
                          style={styles.bubbleDocumentCard}
                          onPress={() => openDocument(item.attachment_url, item.attachment_name)}
                          activeOpacity={0.8}
                        >
                          <FileText size={28} color={isMine ? '#93c5fd' : Colors.primary} />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.docNameText, isMine && { color: '#FFF' }]} numberOfLines={1}>
                              {item.attachment_name || 'Documento adjunto'}
                            </Text>
                            <Text style={[styles.docSizeText, isMine && { color: '#cbd5e1' }]}>
                              {t('chat.openOrDownload', 'Tocar para abrir o descargar')}
                            </Text>
                          </View>
                          <Download size={18} color={isMine ? '#FFF' : Colors.primary} />
                        </TouchableOpacity>
                      )}

                      {/* Texto */}
                      {item.content ? (
                        <Text style={[styles.messageContentText, isMine ? styles.textOutgoing : styles.textIncoming]}>
                          {item.content}
                        </Text>
                      ) : null}

                      {/* Hora y Estado de Entrega / Doble Check Azul */}
                      <View style={styles.timeAndStatusRow}>
                        <Text style={[styles.messageTime, isMine ? styles.timeOutgoing : styles.timeIncoming]}>
                          {formatTime(item.created_at)}
                        </Text>
                        {isMine && (
                          <View style={styles.statusIndicatorWrapper}>
                            {item.status === 'pending' ? (
                              <Clock size={12} color={isDark ? 'rgba(255,255,255,0.7)' : '#cbd5e1'} />
                            ) : isReadByRecipient(item) ? (
                              <CheckCheck size={14} color="#38bdf8" />
                            ) : (
                              <Check size={13} color={isDark ? 'rgba(255,255,255,0.7)' : '#cbd5e1'} />
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Barra Inferior de Entrada de Texto: Específica según Desktop o Móvil */}
          {isDesktop ? (
            <View style={styles.desktopChatInputBar}>
              <TouchableOpacity
                style={styles.desktopClipBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  setAttachmentModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Paperclip size={22} color={isDark ? Colors.text.muted : '#64748b'} />
              </TouchableOpacity>

              <View style={styles.desktopInputInnerBox}>
                <TextInput
                  style={styles.desktopChatTextInput}
                  placeholder={t('chat.writeInstitutional', 'Escribe un mensaje institucional...')}
                  placeholderTextColor={isDark ? Colors.text.muted : '#94a3b8'}
                  value={messageText}
                  onChangeText={setMessageText}
                  onSubmitEditing={() => handleSendMessage()}
                />
                <TouchableOpacity style={{ padding: 4 }} activeOpacity={0.7} onPress={() => setMessageText(prev => prev + ' 😊')}>
                  <Smile size={20} color={isDark ? Colors.text.muted : '#64748b'} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => handleSendMessage()}
                disabled={sending || (!messageText.trim() && !uploadingAttachment)}
                activeOpacity={0.8}
              >
                {sending || uploadingAttachment ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Send size={18} color="#FFF" style={{ marginLeft: 2 }} />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[
              styles.mobileChatInputBar,
              {
                paddingBottom: !isKeyboardVisible 
                  ? (Platform.OS === 'ios' ? Math.max(insets.bottom + 48, 55) : 55) 
                  : (Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 10)
              }
            ]}>
              <View style={styles.mobileInputPill}>
                <TextInput
                  style={styles.mobileChatTextInput}
                  placeholder={t('chat.writeMessage', 'Escribe un mensaje...')}
                  placeholderTextColor={isDark ? Colors.text.muted : '#94a3b8'}
                  value={messageText}
                  onChangeText={setMessageText}
                  onSubmitEditing={() => handleSendMessage()}
                />
                <TouchableOpacity
                  style={styles.mobileClipBtn}
                  onPress={() => {
                    Keyboard.dismiss();
                    setAttachmentModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Paperclip size={20} color={isDark ? Colors.text.muted : '#64748b'} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => handleSendMessage()}
                disabled={sending || (!messageText.trim() && !uploadingAttachment)}
                activeOpacity={0.8}
              >
                {sending || uploadingAttachment ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Send size={18} color="#FFF" style={{ marginLeft: 2 }} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
    );
  };

  // ==========================================
  // MODAL NUEVO CHAT / NUEVO GRUPO
  // ==========================================
  const renderNewChatModal = () => (
    <BottomModal visible={newChatModalVisible} onClose={() => setNewChatModalVisible(false)}>
      <View style={styles.newChatModalContent}>
        <View style={styles.newChatModalHeader}>
          <Text style={styles.newChatModalTitle}>{t('chat.newConversation', 'Nueva Conversación')}</Text>
          <TouchableOpacity onPress={() => setNewChatModalVisible(false)}>
            <X size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Selector de Pestaña: Directo vs Grupo */}
        <View style={styles.newChatTabSwitch}>
          <TouchableOpacity
            style={[styles.newChatTabBtn, newChatTab === 'direct' && styles.newChatTabBtnActive]}
            onPress={() => setNewChatTab('direct')}
          >
            <Text style={[styles.newChatTabText, newChatTab === 'direct' && styles.newChatTabTextActive]}>
              {t('chat.directMessage', 'Mensaje Directo')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.newChatTabBtn, newChatTab === 'group' && styles.newChatTabBtnActive]}
            onPress={() => setNewChatTab('group')}
          >
            <Text style={[styles.newChatTabText, newChatTab === 'group' && styles.newChatTabTextActive]}>
              {t('chat.createGroup', 'Crear Grupo')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* MODO GRUPO: Entrada de Nombre */}
        {newChatTab === 'group' && (
          <View style={styles.groupInputSection}>
            <Text style={styles.groupInputLabel}>{t('chat.groupName', 'Nombre del Grupo *')}</Text>
            <TextInput
              style={styles.groupNameInput}
              placeholder={t('chat.groupNamePlaceholder', 'Ej: Docentes 9º Grado, Excursión Museo...')}
              placeholderTextColor={isDark ? Colors.text.muted : '#94a3b8'}
              value={groupName}
              onChangeText={setGroupName}
            />
            <Text style={styles.groupMembersCounter}>
              {t('chat.membersSelected', { count: selectedGroupMembers.length, defaultValue: `${selectedGroupMembers.length} integrantes seleccionados` })}
            </Text>
          </View>
        )}

        {/* Buscador de Contactos */}
        <View style={styles.contactSearchBox}>
          <Search size={18} color={isDark ? Colors.text.muted : '#94a3b8'} />
          <TextInput
            style={styles.contactSearchInput}
            placeholder={t('chat.searchContactsPlaceholder', 'Buscar por nombre o código institucional...')}
            placeholderTextColor={isDark ? Colors.text.muted : '#94a3b8'}
            value={userSearch}
            onChangeText={setUserSearch}
          />
        </View>

        {/* Lista de Contactos */}
        {loadingUsers ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {usersList.map(u => {
              const isSelected = selectedGroupMembers.some(m => m.id === u.id);
              const badge = getRoleBadgeInfo(u.role);
              return (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.contactItem, isSelected && styles.contactItemActive]}
                  onPress={() => {
                    if (newChatTab === 'direct') {
                      startDirectChat(u);
                    } else {
                      if (isSelected) {
                        setSelectedGroupMembers(prev => prev.filter(m => m.id !== u.id));
                      } else {
                        setSelectedGroupMembers(prev => [...prev, u]);
                      }
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {newChatTab === 'group' && (
                    <View style={{ marginRight: 10 }}>
                      {isSelected ? (
                        <CheckSquare size={20} color={Colors.primary} />
                      ) : (
                        <Square size={20} color="#94a3b8" />
                      )}
                    </View>
                  )}

                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarText}>{(u.full_name || 'U').charAt(0)}</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.contactName} numberOfLines={1} ellipsizeMode="tail">{u.full_name}</Text>
                      <View style={[styles.roleBadge, { backgroundColor: badge.bg, marginLeft: 6, flexShrink: 0 }]}>
                        <Text style={[styles.roleBadgeText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.contactCode}>
                      {u.institutional_code || u.role} {u.grade ? `· ${u.grade}º ${u.section || ''}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Botón de Confirmar Grupo */}
        {newChatTab === 'group' && (
          <TouchableOpacity
            style={[styles.createGroupSubmitBtn, creatingGroup && { opacity: 0.7 }]}
            onPress={handleCreateGroup}
            disabled={creatingGroup}
          >
            {creatingGroup ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.createGroupSubmitText}>
                {t('chat.confirmCreateGroup', { count: selectedGroupMembers.length, defaultValue: `Crear Grupo (${selectedGroupMembers.length} integrantes)` })}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </BottomModal>
  );

  // ==========================================
  // MODAL OPCIONES DE ADJUNTO
  // ==========================================
  const renderAttachmentModal = () => (
    <BottomModal visible={attachmentModalVisible} onClose={() => setAttachmentModalVisible(false)}>
      <View style={styles.attachmentModalContent}>
        <View style={styles.attachmentModalHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.attachmentModalTitle}>{t('chat.sendAttachment', 'Enviar Archivo Adjunto')}</Text>
            <Text style={styles.attachmentModalSubtitle}>{t('chat.sendAttachmentSubtitle', 'Selecciona el tipo de contenido que deseas compartir')}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setAttachmentModalVisible(false)}
            style={styles.attachmentCloseBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <X size={20} color={isDark ? Colors.text.muted : '#64748b'} />
          </TouchableOpacity>
        </View>

        <View style={styles.attachmentOptionsRow}>
          <TouchableOpacity style={styles.attachmentOptionBtn} onPress={() => pickImage(true)}>
            <View style={[styles.attachmentIconCircle, { backgroundColor: '#fee2e2' }]}>
              <Camera size={26} color="#dc2626" />
            </View>
            <Text style={styles.attachmentOptionText}>{t('chat.camera', 'Cámara')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.attachmentOptionBtn} onPress={() => pickImage(false)}>
            <View style={[styles.attachmentIconCircle, { backgroundColor: '#f3e8ff' }]}>
              <ImageIcon size={26} color="#7c3aed" />
            </View>
            <Text style={styles.attachmentOptionText}>{t('chat.gallery', 'Galería')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.attachmentOptionBtn} onPress={pickDocument}>
            <View style={[styles.attachmentIconCircle, { backgroundColor: '#e0f2fe' }]}>
              <FileText size={26} color="#0284c7" />
            </View>
            <Text style={styles.attachmentOptionText}>{t('chat.document', 'Documento')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomModal>
  );

  // ==========================================
  // MODAL VISOR DE IMAGEN FULLSCREEN
  // ==========================================
  const renderImagePreviewModal = () => (
    <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
      <View style={styles.previewImageOverlay}>
        <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setPreviewImage(null)}>
          <X size={26} color="#FFF" />
        </TouchableOpacity>
        {previewImage && (
          <Image source={{ uri: previewImage }} style={styles.previewFullImg} resizeMode="contain" />
        )}
      </View>
    </Modal>
  );

  const handleChatBack = () => {
    Keyboard.dismiss();
    if (previewImage) {
      setPreviewImage(null);
      return;
    }
    if (attachmentModalVisible) {
      setAttachmentModalVisible(false);
      return;
    }
    if (newChatModalVisible) {
      setNewChatModalVisible(false);
      return;
    }
    if (activeConv) {
      setAttachmentModalVisible(false);
      setActiveConv(null);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  };

  return (
    <View style={styles.rootContainer}>
      <Stack.Screen
        options={{
          title: '',
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleChatBack}
              style={styles.headerBackBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ),
          unstable_headerLeftItems: () => [
            {
              type: 'custom',
              hidesSharedBackground: true,
              element: (
                <TouchableOpacity
                  onPress={handleChatBack}
                  style={styles.headerBackBtn}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={20} color="#FFFFFF" />
                </TouchableOpacity>
              ),
            },
          ],
        }}
      />
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDark ? Colors.card : (Colors.headerC || '#0B1956')}
      />

      {isDesktop ? (
        /* VISTA ESCRITORIO / COMPUTADORA (2 COLUMNAS SPLIT MASTER-DETAIL) */
        <View style={styles.desktopContainer}>
          <View style={styles.desktopSidebar}>
            {renderConversationList()}
          </View>
          <View style={styles.desktopChatPane}>
            {renderChatPane()}
          </View>
        </View>
      ) : (
        /* VISTA TELÉFONO / MÓVIL */
        <View style={styles.mobileContainer}>
          {activeConv ? renderChatPane() : renderConversationList()}
        </View>
      )}

      {renderNewChatModal()}
      {renderAttachmentModal()}
      {renderImagePreviewModal()}
    </View>
  );
}

const createStyles = (Colors, theme, isDesktop) => {
  const isDark = theme === 'dark';

  return StyleSheet.create({
    rootContainer: {
      flex: 1,
      backgroundColor: isDark ? Colors.background : '#0B1956',
    },
    desktopContainer: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: isDark ? Colors.background : '#F8FAFC',
    },
    desktopSidebar: {
      width: 380,
      borderRightWidth: 1,
      borderRightColor: isDark ? Colors.gray[200] : '#e2e8f0',
      backgroundColor: isDark ? Colors.card : '#FFF',
    },
    desktopChatPane: {
      flex: 1,
      backgroundColor: isDark ? Colors.background : '#F8FAFC',
    },
    mobileContainer: {
      flex: 1,
      backgroundColor: isDark ? Colors.background : '#0B1956',
    },

    // Lista de Conversaciones
    headerBackBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0, 0, 0, 0.22)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.14)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    convListContainer: {
      flex: 1,
      backgroundColor: isDark ? Colors.card : '#FFF',
    },
    convListHeader: {
      backgroundColor: isDark ? Colors.card : (Colors.headerC || '#0B1956'),
      paddingHorizontal: 20,
      paddingTop: isDesktop ? 16 : 12,
      paddingBottom: 16,
      borderBottomLeftRadius: isDesktop ? 0 : 24,
      borderBottomRightRadius: isDesktop ? 0 : 24,
      borderBottomWidth: isDark ? 1 : 0,
      borderBottomColor: isDark ? Colors.gray[200] : 'transparent',
      marginTop: -1,
    },
    convListHeaderTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    convListTitle: {
      fontSize: 26,
      fontWeight: 'bold',
      color: isDark ? Colors.text.primary : '#FFFFFF',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    },
    plusBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? Colors.primary : '#f3e8ff',
      justifyContent: 'center',
      alignItems: 'center',
    },
    convSearchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? Colors.gray[100] : 'rgba(255, 255, 255, 0.15)',
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 42,
    },
    convSearchInput: {
      flex: 1,
      marginLeft: 8,
      color: isDark ? Colors.text.primary : '#FFFFFF',
      fontSize: 14,
    },

    // Pestañas de Filtro
    filterTabsWrapper: {
      backgroundColor: isDark ? Colors.card : '#FFF',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? Colors.gray[200] : '#f1f5f9',
    },
    filterTabsScroll: {
      paddingHorizontal: 16,
      gap: 8,
    },
    filterPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? Colors.gray[100] : '#FFF',
      borderWidth: 1,
      borderColor: isDark ? Colors.gray[200] : '#cbd5e1',
    },
    filterPillActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    filterPillText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? Colors.text.secondary : '#475569',
    },
    filterPillTextActive: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },

    // Elementos de la Lista
    convItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? Colors.gray[100] : '#f1f5f9',
      backgroundColor: isDark ? Colors.card : '#FFF',
    },
    convItemActive: {
      backgroundColor: isDark ? `${Colors.primary}25` : '#fae8ff',
      borderLeftWidth: 4,
      borderLeftColor: isDark ? Colors.primary : '#7c3aed',
    },
    avatarWrapper: {
      position: 'relative',
      marginRight: 12,
    },
    avatarImg: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    avatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
    onlineDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#22c55e',
      borderWidth: 2,
      borderColor: isDark ? Colors.card : '#FFF',
    },
    convDetails: {
      flex: 1,
    },
    convDetailsTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    convTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: 'bold',
      color: isDark ? Colors.text.primary : '#1e293b',
      marginRight: 8,
    },
    convTitleActive: {
      color: Colors.primary,
    },
    roleBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      marginRight: 6,
      flexShrink: 0,
    },
    roleBadgeText: {
      fontSize: 9,
      fontWeight: 'bold',
    },
    convTime: {
      fontSize: 11,
      color: Colors.text.muted,
      flexShrink: 0,
    },
    convDetailsBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    badgeAndMsgRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 8,
    },
    convLastMsg: {
      fontSize: 13,
      color: isDark ? Colors.text.secondary : '#64748b',
      flex: 1,
    },
    unreadBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
      flexShrink: 0,
    },
    unreadBadgeText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: 'bold',
    },

    // Vista de Conversación Activa
    chatPaneContainer: {
      flex: 1,
      backgroundColor: isDark ? Colors.background : (Colors.headerC || '#0B1956'),
    },
    chatHeaderDesktop: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? Colors.card : '#FFFFFF',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? Colors.gray[200] : '#e2e8f0',
    },
    desktopHeaderAvatarWrapper: {
      position: 'relative',
      marginRight: 12,
    },
    desktopHeaderAvatarImg: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    desktopHeaderAvatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    desktopHeaderAvatarInitial: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    desktopOnlineDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#22c55e',
      borderWidth: 2,
      borderColor: isDark ? Colors.card : '#FFF',
    },
    desktopHeaderInfo: {
      flex: 1,
    },
    desktopHeaderName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? Colors.text.primary : '#0f172a',
    },
    desktopHeaderStatus: {
      fontSize: 12,
      color: Colors.text.muted,
    },
    chatHeaderMobile: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? Colors.card : (Colors.headerC || '#0B1956'),
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 14,
      borderBottomWidth: isDark ? 1 : 0,
      borderBottomColor: isDark ? Colors.gray[200] : 'transparent',
    },
    headerAvatarContainerLeft: {
      marginRight: 12,
    },
    backBtn: {
      padding: 8,
      marginRight: 8,
    },
    chatHeaderInfo: {
      flex: 1,
    },
    chatHeaderName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? Colors.text.primary : '#FFFFFF',
    },
    chatHeaderStatus: {
      fontSize: 12,
      color: isDark ? Colors.text.secondary : '#94a3b8',
    },
    headerAvatarContainer: {
      marginLeft: 12,
    },
    headerAvatarImg: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: isDark ? Colors.gray[200] : '#FFF',
    },
    headerAvatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? Colors.gray[200] : 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerAvatarInitial: {
      color: isDark ? Colors.text.primary : '#FFF',
      fontSize: 16,
      fontWeight: 'bold',
    },

    chatBodyCard: {
      flex: 1,
      backgroundColor: isDark ? Colors.background : '#FFFFFF',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: 'hidden',
    },
    messagesListContent: {
      padding: 16,
      paddingBottom: 24,
    },
    dateSeparatorWrapper: {
      alignItems: 'center',
      marginVertical: 14,
    },
    dateSeparatorText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: Colors.text.muted,
      letterSpacing: 0.5,
    },
    messageRow: {
      flexDirection: 'row',
      marginVertical: 6,
      alignItems: 'flex-end',
    },
    messageRowLeft: {
      justifyContent: 'flex-start',
    },
    messageRowRight: {
      justifyContent: 'flex-end',
    },
    messageAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? Colors.gray[200] : '#e2e8f0',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
      marginBottom: 4,
    },
    messageAvatarInitial: {
      color: isDark ? Colors.text.primary : '#475569',
      fontSize: 13,
      fontWeight: 'bold',
    },
    messageBubble: {
      maxWidth: isDesktop ? '60%' : '78%',
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    bubbleIncoming: {
      backgroundColor: isDark ? Colors.gray[100] : '#f1f5f9',
      borderBottomLeftRadius: 4,
    },
    bubbleOutgoing: {
      backgroundColor: isDark ? Colors.primary : '#0e1726',
      borderBottomRightRadius: 4,
    },
    groupSenderName: {
      fontSize: 11,
      fontWeight: 'bold',
      color: isDark ? (Colors.primaryLight || '#a855f7') : '#7c3aed',
      marginBottom: 4,
    },
    messageContentText: {
      fontSize: 14,
      lineHeight: 20,
    },
    textIncoming: {
      color: isDark ? Colors.text.primary : '#1e293b',
    },
    textOutgoing: {
      color: '#FFFFFF',
    },
    messageTime: {
      fontSize: 10,
      textAlign: 'right',
    },
    timeIncoming: {
      color: isDark ? Colors.text.muted : '#94a3b8',
    },
    timeOutgoing: {
      color: isDark ? 'rgba(255,255,255,0.75)' : '#cbd5e1',
    },
    timeAndStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 4,
    },
    statusIndicatorWrapper: {
      marginLeft: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bubbleImage: {
      width: 220,
      height: 160,
      borderRadius: 12,
      marginBottom: 4,
    },
    bubbleDocumentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      marginBottom: 4,
    },
    docNameText: {
      fontSize: 13,
      fontWeight: 'bold',
      color: isDark ? Colors.text.primary : '#1e293b',
    },
    docSizeText: {
      fontSize: 11,
      color: Colors.text.muted,
    },

    // Barra de Envío Desktop y Móvil
    desktopChatInputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: isDark ? Colors.card : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: isDark ? Colors.gray[200] : '#e2e8f0',
    },
    desktopClipBtn: {
      padding: 8,
      marginRight: 8,
    },
    desktopInputInnerBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? Colors.gray[100] : '#f1f5f9',
      borderRadius: 24,
      paddingHorizontal: 16,
      height: 44,
      borderWidth: 1,
      borderColor: isDark ? Colors.gray[200] : '#e2e8f0',
      marginRight: 10,
    },
    desktopChatTextInput: {
      flex: 1,
      fontSize: 14,
      color: isDark ? Colors.text.primary : '#1e293b',
    },
    mobileChatInputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? Colors.card : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: isDark ? Colors.gray[200] : '#f1f5f9',
    },
    mobileInputPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? Colors.gray[100] : '#f1f3f5',
      borderRadius: 24,
      paddingHorizontal: 14,
      height: 44,
      marginRight: 8,
    },
    mobileChatTextInput: {
      flex: 1,
      fontSize: 14,
      color: isDark ? Colors.text.primary : '#1e293b',
    },
    mobileClipBtn: {
      padding: 6,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Estados Vacíos y de Carga
    centerLoading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 13,
      color: Colors.text.muted,
    },
    emptyConvState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
    },
    emptyConvTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? Colors.text.primary : '#1e293b',
    },
    emptyConvSubtitle: {
      fontSize: 13,
      color: Colors.text.muted,
      textAlign: 'center',
      marginTop: 4,
    },
    noChatSelectedContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    noChatIconCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: isDark ? `${Colors.primary}25` : '#e0e7ff',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    noChatTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? Colors.text.primary : '#0B1956',
    },
    noChatSubtitle: {
      fontSize: 14,
      color: Colors.text.muted,
      textAlign: 'center',
      marginTop: 8,
      maxWidth: 360,
    },

    // Modal Nuevo Chat
    newChatModalContent: {
      padding: 20,
      backgroundColor: Colors.card,
    },
    newChatModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    newChatModalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? Colors.text.primary : '#0B1956',
    },
    newChatTabSwitch: {
      flexDirection: 'row',
      backgroundColor: isDark ? Colors.gray[100] : '#f1f5f9',
      borderRadius: 12,
      padding: 4,
      marginBottom: 14,
    },
    newChatTabBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    newChatTabBtnActive: {
      backgroundColor: isDark ? Colors.gray[200] : '#FFF',
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    newChatTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: Colors.text.muted,
    },
    newChatTabTextActive: {
      color: isDark ? Colors.text.primary : Colors.primary,
      fontWeight: 'bold',
    },
    groupInputSection: {
      marginBottom: 12,
    },
    groupInputLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: isDark ? Colors.text.primary : Colors.primary,
      marginBottom: 4,
    },
    groupNameInput: {
      backgroundColor: isDark ? Colors.gray[100] : '#f8fafc',
      borderWidth: 1,
      borderColor: isDark ? Colors.gray[200] : '#cbd5e1',
      borderRadius: 10,
      padding: 10,
      fontSize: 14,
      color: isDark ? Colors.text.primary : '#1e293b',
    },
    groupMembersCounter: {
      fontSize: 11,
      color: Colors.primary,
      fontWeight: 'bold',
      marginTop: 4,
    },
    contactSearchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? Colors.gray[100] : '#f1f5f9',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
      marginBottom: 10,
    },
    contactSearchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 13,
      color: isDark ? Colors.text.primary : '#1e293b',
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? Colors.gray[100] : '#f1f5f9',
    },
    contactItemActive: {
      backgroundColor: isDark ? `${Colors.primary}25` : '#f3e8ff',
      borderRadius: 8,
      paddingHorizontal: 6,
    },
    contactAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contactAvatarText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: 'bold',
    },
    contactName: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? Colors.text.primary : '#1e293b',
      flexShrink: 1,
    },
    contactCode: {
      fontSize: 11,
      color: Colors.text.muted,
      marginTop: 1,
    },
    createGroupSubmitBtn: {
      backgroundColor: Colors.primary,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 14,
    },
    createGroupSubmitText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 14,
    },

    // Modal Adjuntos
    attachmentModalContent: {
      padding: 20,
      paddingBottom: 28,
      backgroundColor: Colors.card,
    },
    attachmentModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
      width: '100%',
    },
    attachmentCloseBtn: {
      padding: 6,
      borderRadius: 16,
      backgroundColor: isDark ? Colors.gray[100] : '#f1f5f9',
    },
    attachmentModalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? Colors.text.primary : Colors.primary,
      marginBottom: 2,
    },
    attachmentModalSubtitle: {
      fontSize: 13,
      color: Colors.text.muted,
      marginBottom: 8,
    },
    attachmentOptionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      paddingBottom: 10,
    },
    attachmentOptionBtn: {
      alignItems: 'center',
    },
    attachmentIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    attachmentOptionText: {
      fontSize: 13,
      fontWeight: 'bold',
      color: isDark ? Colors.text.primary : '#1e293b',
    },

    // Modal Visor de Imagen
    previewImageOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    closePreviewBtn: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : 20,
      right: 20,
      zIndex: 10,
      padding: 8,
    },
    previewFullImg: {
      width: '94%',
      height: '80%',
    },
  });
};
