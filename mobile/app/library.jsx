import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  useWindowDimensions,
  Linking
} from 'react-native';
import {
  BookOpen,
  Search,
  X,
  Plus,
  Tag,
  Download,
  ExternalLink,
  Edit2,
  Trash2,
  FileText,
  Layers,
  UploadCloud,
  AlertCircle,
  CheckCircle2
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { useAlert } from '../src/context/AlertContext';
import { supabase } from '../src/utils/supabase';
import api from '../src/utils/api';
import PageHeader from '../src/components/PageHeader';
import BottomModal from '../src/components/BottomModal';

export default function LibraryScreen() {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const { profile } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const { width } = useWindowDimensions();

  // Roles autorizados para gestión de libros y categorías (Super Admin, Admin, Coordinador y Docente)
  const isAdmin = ['super_admin', 'admin', 'coordinator', 'teacher'].includes(profile?.role);

  // Responsive grid adaptativo: 2 columnas en móviles, 3 en tablets, 4-5 en monitores anchos
  const numColumns = width >= 1200 ? 5 : (width >= 900 ? 4 : (width >= 600 ? 3 : 2));
  const cardGap = 12;

  // Estados principales de catálogo
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, hasMore: false });

  // Estados de modales
  const [selectedBook, setSelectedBook] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Estados del formulario de Libro (Crear / Editar)
  const [editingBookId, setEditingBookId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formCoverBase64, setFormCoverBase64] = useState(null);
  const [formCoverFilename, setFormCoverFilename] = useState('');
  const [formResourceType, setFormResourceType] = useState('pdf'); // 'pdf' | 'link'
  const [formResourceUrl, setFormResourceUrl] = useState('');
  const [formResourceName, setFormResourceName] = useState('');
  const [formPdfBase64, setFormPdfBase64] = useState(null);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formError, setFormError] = useState(null);

  // Estado del formulario de Categoría y retroalimentación inline
  const [newCategoryName, setNewCategoryName] = useState('');
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState(null);
  const [categorySuccess, setCategorySuccess] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deletingCatId, setDeletingCatId] = useState(null);

  // Estados de confirmación de eliminación de libro en detalle
  const [confirmDeleteBook, setConfirmDeleteBook] = useState(false);
  const [deletingBook, setDeletingBook] = useState(false);

  // Debounce de búsqueda (300ms)
  const searchTimeoutRef = useRef(null);
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(text.trim());
    }, 300);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedSearch('');
  };

  // Cargar categorías iniciales (con fallback resiliente directo a Supabase)
  const fetchCategories = useCallback(async () => {
    let success = false;
    try {
      const res = await api.get('/library/categories');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setCategories(res.data);
        success = true;
      }
    } catch {
      // Silenciosamente pasa al fallback directo
    }

    if (!success) {
      try {
        const { data, error } = await supabase
          .from('book_categories')
          .select(`
            id,
            name,
            created_at,
            books:books(count)
          `)
          .order('name');
        if (!error && Array.isArray(data)) {
          const mapped = data.map(c => ({
            id: c.id,
            name: c.name,
            created_at: c.created_at,
            books_count: c.books?.[0]?.count || 0
          }));
          setCategories(mapped);
        } else {
          const { data: simpleData } = await supabase
            .from('book_categories')
            .select('id, name, created_at')
            .order('name');
          if (Array.isArray(simpleData)) {
            setCategories(simpleData);
          }
        }
      } catch (err) {
        console.warn('Error fetching categories fallback:', err);
      }
    }
  }, []);

  // Cargar catálogo de libros con paginación, búsqueda y filtros
  const fetchBooks = useCallback(async (page = 1, append = false) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    let loaded = false;
    try {
      const params = {
        page,
        limit: 12,
        search: debouncedSearch || undefined,
        category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
      };

      const res = await api.get('/library/books', { params });
      if (res.data && Array.isArray(res.data.books)) {
        const newBooks = res.data.books;
        const newPagination = res.data.pagination || { page: 1, totalPages: 1, hasMore: false };

        if (append) {
          setBooks(prev => [...prev, ...newBooks]);
        } else {
          setBooks(newBooks);
        }
        setPagination(newPagination);
        loaded = true;
      }
    } catch {
      // Silenciosamente pasa al fallback directo
    }

    // Fallback directo a Supabase si el backend en Vercel aún no se desplegó
    if (!loaded) {
      try {
        const limitNum = 12;
        const from = (page - 1) * limitNum;
        const to = from + limitNum - 1;

        let query = supabase
          .from('books')
          .select(`
            id,
            title,
            author,
            description,
            category_id,
            cover_url,
            resource_type,
            resource_url,
            resource_name,
            created_at,
            updated_at,
            category:book_categories(id, name)
          `, { count: 'exact' });

        if (selectedCategory && selectedCategory !== 'all') {
          query = query.eq('category_id', selectedCategory);
        }

        if (debouncedSearch && debouncedSearch.trim()) {
          const term = debouncedSearch.trim();
          query = query.or(`title.ilike.%${term}%,author.ilike.%${term}%`);
        }

        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data: supaBooks, count, error: supaErr } = await query;
        if (!supaErr && Array.isArray(supaBooks)) {
          const total = count || 0;
          const totalPages = Math.ceil(total / limitNum) || 1;
          const newPag = {
            page,
            totalPages,
            hasMore: page < totalPages
          };

          if (append) {
            setBooks(prev => [...prev, ...supaBooks]);
          } else {
            setBooks(supaBooks);
          }
          setPagination(newPag);
        } else if (!append) {
          setBooks([]);
        }
      } catch (err) {
        console.warn('Error fetching books fallback:', err);
        if (!append) setBooks([]);
      }
    }

    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
  }, [debouncedSearch, selectedCategory]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchBooks(1, false);
  }, [fetchBooks]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCategories();
    fetchBooks(1, false);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && pagination.hasMore) {
      fetchBooks(pagination.page + 1, true);
    }
  };

  // Abrir detalle del libro
  const handleCardPress = (book) => {
    setSelectedBook(book);
    setDetailModalVisible(true);
  };

  // Acción de Recurso: Descargar PDF o Visitar enlace web
  const handleResourceAction = async (book) => {
    if (!book || !book.resource_url) return;

    if (book.resource_type === 'link') {
      try {
        const canOpen = await Linking.canOpenURL(book.resource_url);
        if (canOpen) {
          await Linking.openURL(book.resource_url);
        } else {
          showAlert({
            type: 'error',
            title: t('common.error', 'Error'),
            message: t('library.invalidUrl', 'No se puede abrir el enlace especificado.')
          });
        }
      } catch {
        showAlert({
          type: 'error',
          title: t('common.error', 'Error'),
          message: t('library.linkOpenError', 'Ocurrió un error al abrir el enlace externo.')
        });
      }
    } else if (book.resource_type === 'pdf') {
      // En Web, abrir en nueva pestaña directamente
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.open(book.resource_url, '_blank', 'noopener,noreferrer');
        } else {
          Linking.openURL(book.resource_url).catch(() => {});
        }
        return;
      }

      // En Móvil (Android / iOS / Expo Go / APK)
      setDownloadingPdf(true);
      try {
        const cleanTitle = (book.title || 'libro').replace(/[^a-zA-Z0-9]/g, '_');
        const fileUri = `${FileSystem.documentDirectory}${cleanTitle}.pdf`;

        const downloadResult = await FileSystem.downloadAsync(
          book.resource_url,
          fileUri
        );

        if (downloadResult.status === 200) {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: 'application/pdf',
              dialogTitle: book.title || 'Compartir libro'
            });
          } else {
            showAlert({
              type: 'success',
              title: t('library.downloadComplete', 'Descarga completada'),
              message: t('library.savedToStorage', 'El PDF fue guardado correctamente.')
            });
          }
        } else {
          throw new Error('HTTP status ' + downloadResult.status);
        }
      } catch (err) {
        console.warn('Error downloading PDF:', err);
        // Fallback nativo a navegador externo
        Linking.openURL(book.resource_url).catch(() => {});
      } finally {
        setDownloadingPdf(false);
      }
    }
  };

  // --- ADMINISTRACIÓN: CREAR / EDITAR LIBROS ---
  const openCreateBookModal = () => {
    setEditingBookId(null);
    setFormTitle('');
    setFormAuthor('');
    setFormDescription('');
    setFormCategoryId(categories[0]?.id || '');
    setFormCoverUrl('');
    setFormCoverBase64(null);
    setFormCoverFilename('');
    setFormResourceType('pdf');
    setFormResourceUrl('');
    setFormResourceName('');
    setFormPdfBase64(null);
    setFormError(null);
    setFormModalVisible(true);
  };

  const openEditBookModal = (book) => {
    setConfirmDeleteBook(false);
    setDetailModalVisible(false);
    // Pausa para asegurar que el BottomModal de detalle termine su animación antes de abrir el formulario (evita bloqueo nativo en Android)
    setTimeout(() => {
      setEditingBookId(book.id);
      setFormTitle(book.title || '');
      setFormAuthor(book.author || '');
      setFormDescription(book.description || '');
      setFormCategoryId(book.category_id || categories[0]?.id || '');
      setFormCoverUrl(book.cover_url || '');
      setFormCoverBase64(null);
      setFormCoverFilename('');
      setFormResourceType(book.resource_type || 'pdf');
      setFormResourceUrl(book.resource_url || '');
      setFormResourceName(book.resource_name || '');
      setFormPdfBase64(null);
      setFormError(null);
      setFormModalVisible(true);
    }, Platform.OS === 'web' ? 50 : 350);
  };

  // Selector de Portada compatible Web y Móvil (apertura instantánea sin deprecación)
  const pickCoverImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showAlert({
            type: 'warning',
            title: t('common.warning', 'Permiso Requerido'),
            message: 'Se necesita permiso para acceder a la galería de fotos.'
          });
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Abre instantáneamente sin la pesada actividad de recorte nativa
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.fileName || `cover_${Date.now()}.jpg`;
        let base64 = asset.base64;

        if (!base64 && Platform.OS === 'web' && asset.uri) {
          try {
            const resp = await fetch(asset.uri);
            const blob = await resp.blob();
            base64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const b64 = reader.result.split(',')[1];
                resolve(b64);
              };
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.warn('Error reading web image blob:', e);
          }
        }

        setFormCoverBase64(base64);
        setFormCoverFilename(filename);
        setFormCoverUrl(asset.uri);
      }
    } catch (err) {
      console.warn('Error picking cover image:', err);
    }
  };

  // Selector de PDF compatible Web y Móvil
  const pickPdfDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Validar tamaño máximo de 20 MB
        if (asset.size && asset.size > 20 * 1024 * 1024) {
          showAlert({
            type: 'error',
            title: t('common.error', 'Error'),
            message: t('library.pdfTooLarge', 'El PDF supera el límite máximo de 20 MB.')
          });
          return;
        }

        let base64Data = null;
        if (Platform.OS === 'web') {
          try {
            const resp = await fetch(asset.uri);
            const blob = await resp.blob();
            base64Data = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const b64 = reader.result.split(',')[1];
                resolve(b64);
              };
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.warn('Error reading web pdf blob:', e);
          }
        } else {
          base64Data = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }

        setFormPdfBase64(base64Data);
        setFormResourceName(asset.name || 'documento.pdf');
        setFormResourceUrl(asset.uri);
      }
    } catch (err) {
      console.warn('Error picking PDF document:', err);
    }
  };

  // Helper para convertir base64 a Uint8Array de forma nativa en JS
  const base64ToUint8Array = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  // Guardar libro (Crear / Actualizar con subida y respaldo a Supabase)
  const handleSaveBook = async () => {
    setFormError(null);
    if (!formTitle.trim()) {
      setFormError('Por favor ingresa el título del libro.');
      return;
    }
    if (!formAuthor.trim()) {
      setFormError('Por favor ingresa el autor del libro.');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Por favor ingresa una breve descripción.');
      return;
    }
    if (!formCategoryId) {
      setFormError('Por favor selecciona una categoría.');
      return;
    }

    if (formResourceType === 'link') {
      const trimmed = formResourceUrl.trim().toLowerCase();
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        setFormError('El enlace externo debe iniciar con http:// o https://');
        return;
      }
    } else if (formResourceType === 'pdf') {
      if (!editingBookId && !formPdfBase64 && !formResourceUrl) {
        setFormError('Por favor selecciona un archivo PDF para el libro.');
        return;
      }
    }

    setSubmittingForm(true);
    try {
      let finalCoverUrl = formCoverUrl;
      let finalResourceUrl = formResourceUrl;

      // 1. Subir portada si se seleccionó una nueva
      if (formCoverBase64) {
        let uploaded = false;
        try {
          const coverRes = await api.post('/library/upload', {
            base64: formCoverBase64,
            filename: formCoverFilename || 'cover.jpg',
            mimeType: 'image/jpeg',
            resourceType: 'cover',
          });
          if (coverRes.data?.url) {
            finalCoverUrl = coverRes.data.url;
            uploaded = true;
          }
        } catch {
          // Fallback a Supabase Storage directo
        }

        if (!uploaded) {
          const path = `library/covers/${Date.now()}_cover.jpg`;
          const bytes = base64ToUint8Array(formCoverBase64);
          const { error: upErr } = await supabase.storage.from('cokiechat').upload(path, bytes, {
            contentType: 'image/jpeg',
            upsert: true,
          });
          if (!upErr) {
            const { data } = supabase.storage.from('cokiechat').getPublicUrl(path);
            finalCoverUrl = data.publicUrl;
          }
        }
      }

      // 2. Subir PDF si se seleccionó uno nuevo
      if (formResourceType === 'pdf' && formPdfBase64) {
        let uploaded = false;
        try {
          const pdfRes = await api.post('/library/upload', {
            base64: formPdfBase64,
            filename: formResourceName || 'document.pdf',
            mimeType: 'application/pdf',
            resourceType: 'pdf',
          });
          if (pdfRes.data?.url) {
            finalResourceUrl = pdfRes.data.url;
            uploaded = true;
          }
        } catch {
          // Fallback a Supabase Storage directo
        }

        if (!uploaded) {
          const cleanName = (formResourceName || 'document.pdf').replace(/[^a-zA-Z0-9.-]/g, '_');
          const path = `library/pdfs/${Date.now()}_${cleanName}`;
          const bytes = base64ToUint8Array(formPdfBase64);
          const { error: upErr } = await supabase.storage.from('cokiechat').upload(path, bytes, {
            contentType: 'application/pdf',
            upsert: true,
          });
          if (!upErr) {
            const { data } = supabase.storage.from('cokiechat').getPublicUrl(path);
            finalResourceUrl = data.publicUrl;
          }
        }
      }

      const payload = {
        title: formTitle.trim(),
        author: formAuthor.trim(),
        description: formDescription.trim(),
        category_id: formCategoryId,
        cover_url: finalCoverUrl || null,
        resource_type: formResourceType,
        resource_url: finalResourceUrl.trim(),
        resource_name: formResourceName.trim() || null,
      };

      let saved = false;
      try {
        if (editingBookId) {
          await api.put(`/library/books/${editingBookId}`, payload);
        } else {
          await api.post('/library/books', payload);
        }
        saved = true;
      } catch {
        // Fallback a Supabase DB directo
      }

      if (!saved) {
        if (editingBookId) {
          const { error } = await supabase
            .from('books')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', editingBookId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('books')
            .insert([{ ...payload, created_by: profile?.id || null }]);
          if (error) throw error;
        }
      }

      // Cerrar primero el modal antes de lanzar la alerta para evitar conflicto de Modals en Android
      setFormModalVisible(false);
      if (Platform.OS !== 'web') Keyboard.dismiss();

      setTimeout(() => {
        showAlert({
          type: 'success',
          title: t('common.success', 'Éxito'),
          message: editingBookId ? 'Libro actualizado correctamente.' : 'Libro agregado a la biblioteca.'
        });
      }, Platform.OS === 'web' ? 50 : 350);

      fetchBooks(1, false);
      fetchCategories();
    } catch (err) {
      console.warn('Error saving book:', err);
      setFormError(err.message || 'Ocurrió un error al guardar el libro.');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Eliminar libro (confirmación segura dentro del modal de detalle)
  const executeDeleteBook = async (book) => {
    if (!book || !book.id) return;
    setDeletingBook(true);
    try {
      let deleted = false;
      try {
        await api.delete(`/library/books/${book.id}`);
        deleted = true;
      } catch {
        // Fallback directo a Supabase
      }

      if (!deleted) {
        // Limpiar archivos en storage si existen
        if (book.cover_url && book.cover_url.includes('cokiechat')) {
          const parts = book.cover_url.split('/cokiechat/');
          if (parts[1]) {
            await supabase.storage.from('cokiechat').remove([decodeURIComponent(parts[1])]);
          }
        }
        if (book.resource_type === 'pdf' && book.resource_url && book.resource_url.includes('cokiechat')) {
          const parts = book.resource_url.split('/cokiechat/');
          if (parts[1]) {
            await supabase.storage.from('cokiechat').remove([decodeURIComponent(parts[1])]);
          }
        }
        const { error } = await supabase.from('books').delete().eq('id', book.id);
        if (error) throw error;
      }

      setConfirmDeleteBook(false);
      setDetailModalVisible(false);
      if (Platform.OS !== 'web') Keyboard.dismiss();

      setTimeout(() => {
        showAlert({
          type: 'success',
          title: t('common.success', 'Éxito'),
          message: 'Libro eliminado de la biblioteca.'
        });
      }, Platform.OS === 'web' ? 50 : 350);

      fetchBooks(1, false);
      fetchCategories();
    } catch (err) {
      console.warn('Error deleting book:', err);
      setConfirmDeleteBook(false);
      setTimeout(() => {
        showAlert({
          type: 'error',
          title: t('common.error', 'Error'),
          message: err.message || 'No se pudo eliminar el libro.'
        });
      }, Platform.OS === 'web' ? 50 : 350);
    } finally {
      setDeletingBook(false);
    }
  };

  // --- ADMINISTRACIÓN: GESTIÓN DE CATEGORÍAS (Retroalimentación 100% inline sin alertas bloqueantes) ---
  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCategoryError('Ingresa un nombre para la categoría.');
      return;
    }

    const exists = categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setCategoryError('Ya existe una categoría con ese nombre.');
      return;
    }

    setCategoryError(null);
    setCategorySuccess(null);
    setSubmittingCategory(true);

    try {
      let created = false;
      try {
        await api.post('/library/categories', { name: trimmed });
        created = true;
      } catch (e) {
        if (e.response?.data?.error) {
          setCategoryError(e.response.data.error);
          setSubmittingCategory(false);
          return;
        }
      }

      if (!created) {
        const { error } = await supabase.from('book_categories').insert([{ name: trimmed }]);
        if (error) {
          if (error.code === '23505') {
            setCategoryError('Ya existe una categoría con ese nombre.');
            setSubmittingCategory(false);
            return;
          }
          throw error;
        }
      }

      setNewCategoryName('');
      setCategorySuccess(`Categoría "${trimmed}" agregada.`);
      fetchCategories();
      setTimeout(() => setCategorySuccess(null), 3500);
    } catch (err) {
      console.warn('Error creating category:', err);
      setCategoryError(err.message || 'Error al crear la categoría.');
    } finally {
      setSubmittingCategory(false);
    }
  };

  const requestDeleteCategory = (cat) => {
    setCategoryError(null);
    setCategorySuccess(null);
    if (cat.books_count && cat.books_count > 0) {
      setCategoryError(`No puedes eliminar "${cat.name}" porque contiene ${cat.books_count} libro(s) asociados.`);
      return;
    }
    setCategoryToDelete(cat.id);
  };

  const confirmDeleteCategory = async (cat) => {
    setDeletingCatId(cat.id);
    setCategoryError(null);
    try {
      let deleted = false;
      try {
        await api.delete(`/library/categories/${cat.id}`);
        deleted = true;
      } catch (e) {
        if (e.response?.data?.error) {
          setCategoryError(e.response.data.error);
          setDeletingCatId(null);
          setCategoryToDelete(null);
          return;
        }
      }

      if (!deleted) {
        // Verificar si tiene libros antes de borrar en fallback
        const { count } = await supabase
          .from('books')
          .select('id', { count: 'exact', head: true })
          .eq('category_id', cat.id);

        if (count && count > 0) {
          setCategoryError(`No puedes eliminar "${cat.name}" porque contiene ${count} libro(s) asociados.`);
          setDeletingCatId(null);
          setCategoryToDelete(null);
          return;
        }

        const { error } = await supabase.from('book_categories').delete().eq('id', cat.id);
        if (error) throw error;
      }

      setCategoryToDelete(null);
      setCategorySuccess(`Categoría "${cat.name}" eliminada.`);
      setTimeout(() => setCategorySuccess(null), 3000);
      fetchCategories();
      if (selectedCategory === cat.id) {
        setSelectedCategory('all');
      }
    } catch (err) {
      console.warn('Error deleting category:', err);
      setCategoryError(err.message || 'No se pudo eliminar la categoría.');
    } finally {
      setDeletingCatId(null);
    }
  };

  const styles = useMemo(() => createStyles(Colors, isDark, numColumns, cardGap), [Colors, isDark, numColumns]);

  return (
    <View style={styles.root}>
      {/* 
        Encabezado estandarizado idéntico a Avisos, Almuerzos y demás módulos.
        showBack omitido (false por defecto) para NO duplicar la flecha de navegación de _layout.jsx
      */}
      <PageHeader
        title={t('titles.library', 'Biblioteca')}
        subtitle={t('titles.librarySubtitle', 'Catálogo de libros y recursos educativos')}
      />

      {/* 
        ZONA SUPERIOR FIJA: Barra de Búsqueda y Chips de Categorías
        Permanece siempre fija al tope de la pantalla para no tener que volver arriba al hacer scroll
      */}
      <View style={styles.stickyHeaderArea}>
        {/* Barra de Búsqueda y botón de Categorías */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Search size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('library.searchPlaceholder', 'Buscar por título o autor...')}
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Botón de Gestión de Categorías para Administradores / Coordinadores */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.categoryManageBtn}
              onPress={() => setCategoryModalVisible(true)}
              activeOpacity={0.8}
              accessibilityLabel="Administrar categorías"
            >
              <Layers size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Chips de Categorías con la estética idéntica a Avisos Institucionales */}
        <View style={styles.filterPillsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsContainer}
          >
            <TouchableOpacity
              style={[
                styles.filterPill,
                selectedCategory === 'all' && styles.filterPillActive
              ]}
              onPress={() => setSelectedCategory('all')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedCategory === 'all' && styles.filterPillTextActive
                ]}
              >
                {t('library.allCategories', 'Todas')}
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.filterPill,
                    isSelected && styles.filterPillActive
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isSelected && styles.filterPillTextActive
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Contenido Principal con Scroll (Grid de Tarjetas) */}
      <View style={styles.gridContainer}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              {t('library.loading', 'Cargando catálogo escolar...')}
            </Text>
          </View>
        ) : books.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <BookOpen size={40} color={isDark ? '#64748B' : '#94A3B8'} />
            </View>
            <Text style={styles.emptyTitle}>
              {t('library.emptyTitle', 'No se encontraron libros')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim() || selectedCategory !== 'all'
                ? t('library.emptyFilterSub', 'Prueba modificando la búsqueda o seleccionando otra categoría.')
                : t('library.emptyCatalog', 'Aún no hay libros publicados en esta categoría.')}
            </Text>
            {(searchQuery.trim() !== '' || selectedCategory !== 'all') && (
              <TouchableOpacity
                style={styles.clearFiltersBtn}
                onPress={() => {
                  clearSearch();
                  setSelectedCategory('all');
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.clearFiltersBtnText}>
                  {t('library.clearFilters', 'Restablecer filtros')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={books}
            key={`grid-${numColumns}`}
            numColumns={numColumns}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              ) : <View style={{ height: 40 }} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.bookCard}
                onPress={() => handleCardPress(item)}
                activeOpacity={0.82}
              >
                {/* Portada o Placeholder */}
                <View style={styles.cardCoverContainer}>
                  {item.cover_url ? (
                    <Image
                      source={{ uri: item.cover_url }}
                      style={styles.cardCoverImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.cardCoverPlaceholder}>
                      <BookOpen size={36} color={isDark ? '#60A5FA' : Colors.primary} strokeWidth={1.7} />
                      <Text style={styles.cardPlaceholderLabel} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </View>
                  )}

                  {/* Badge de tipo de recurso (PDF o Enlace) */}
                  <View style={styles.cardResourceBadge}>
                    {item.resource_type === 'pdf' ? (
                      <View style={[styles.resourceDot, { backgroundColor: '#EF4444' }]}>
                        <FileText size={11} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={[styles.resourceDot, { backgroundColor: '#0284c7' }]}>
                        <ExternalLink size={11} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                </View>

                {/* Metadatos: Título, Autor y Categoría (NUNCA quién lo subió) */}
                <View style={styles.cardInfo}>
                  <View style={styles.cardCategoryBadge}>
                    <Text style={styles.cardCategoryText} numberOfLines={1}>
                      {item.category?.name || 'General'}
                    </Text>
                  </View>

                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <Text style={styles.cardAuthor} numberOfLines={1}>
                    {item.author}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Botón Flotante (FAB) para Agregar Libro (Idéntico al de Avisos) */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          onPress={openCreateBookModal}
          activeOpacity={0.85}
          accessibilityLabel="Agregar nuevo libro"
        >
          <Plus size={26} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
      )}

      {/* --- MODAL 1: DETALLE DEL LIBRO --- */}
      <BottomModal
        visible={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false);
          setConfirmDeleteBook(false);
        }}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedBook?.title || 'Detalle del libro'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setDetailModalVisible(false);
                setConfirmDeleteBook(false);
              }}
              style={styles.modalCloseBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={22} color={isDark ? '#FFFFFF' : Colors.text.primary} />
            </TouchableOpacity>
          </View>

          {selectedBook && (
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header del libro con portada centrada */}
              <View style={styles.detailCoverSection}>
                {selectedBook.cover_url ? (
                  <Image
                    source={{ uri: selectedBook.cover_url }}
                    style={styles.detailCoverImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.detailCoverPlaceholder}>
                    <BookOpen size={48} color={isDark ? '#60A5FA' : Colors.primary} />
                  </View>
                )}

                <View style={styles.detailMetaBlock}>
                  <Text style={styles.detailTitle}>{selectedBook.title}</Text>
                  <Text style={styles.detailAuthor}>{selectedBook.author}</Text>

                  <View style={styles.detailBadgesRow}>
                    <View style={styles.detailPillCategory}>
                      <Tag size={12} color={isDark ? '#93C5FD' : '#0284c7'} style={{ marginRight: 4 }} />
                      <Text style={styles.detailPillCategoryText}>
                        {selectedBook.category?.name || 'General'}
                      </Text>
                    </View>

                    <View style={styles.detailPillResource}>
                      {selectedBook.resource_type === 'pdf' ? (
                        <>
                          <FileText size={12} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={[styles.detailPillResourceText, { color: '#EF4444' }]}>Documento PDF</Text>
                        </>
                      ) : (
                        <>
                          <ExternalLink size={12} color="#0284c7" style={{ marginRight: 4 }} />
                          <Text style={[styles.detailPillResourceText, { color: '#0284c7' }]}>Enlace Externo</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Sinopsis / Descripción completa */}
              <View style={styles.detailSectionBox}>
                <Text style={styles.detailSectionHeading}>
                  {t('library.synopsis', 'Descripción / Sinopsis')}
                </Text>
                <Text style={styles.detailDescriptionText}>
                  {selectedBook.description}
                </Text>
              </View>

              {/* Botón de acción único: Descargar PDF o Visitar enlace */}
              <View style={styles.detailActionArea}>
                {selectedBook.resource_type === 'pdf' ? (
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleResourceAction(selectedBook)}
                    disabled={downloadingPdf}
                    activeOpacity={0.85}
                  >
                    {downloadingPdf ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Download size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryActionBtnText}>
                          {t('library.downloadPdf', 'Descargar PDF')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: '#0284c7' }]}
                    onPress={() => handleResourceAction(selectedBook)}
                    activeOpacity={0.85}
                  >
                    <ExternalLink size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryActionBtnText}>
                      {t('library.visitLink', 'Visitar recurso web')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Opciones de Administración (Editar y Eliminar) para Admin/Coordinador */}
              {isAdmin && (
                confirmDeleteBook ? (
                  <View style={styles.confirmDeleteBox}>
                    <Text style={styles.confirmDeleteText}>
                      ¿Deseas eliminar este libro definitivamente?
                    </Text>
                    <View style={styles.confirmDeleteButtons}>
                      <TouchableOpacity
                        style={styles.cancelDeleteBtn}
                        onPress={() => setConfirmDeleteBook(false)}
                        disabled={deletingBook}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.cancelDeleteBtnText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.doDeleteBtn}
                        onPress={() => executeDeleteBook(selectedBook)}
                        disabled={deletingBook}
                        activeOpacity={0.8}
                      >
                        {deletingBook ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.doDeleteBtnText}>Sí, eliminar</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.adminButtonsRow}>
                    <TouchableOpacity
                      style={styles.adminEditBtn}
                      onPress={() => openEditBookModal(selectedBook)}
                      activeOpacity={0.8}
                    >
                      <Edit2 size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.adminBtnText, { color: Colors.primary }]}>
                        {t('library.editBook', 'Editar')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.adminDeleteBtn}
                      onPress={() => setConfirmDeleteBook(true)}
                      activeOpacity={0.8}
                    >
                      <Trash2 size={16} color="#EF4444" style={{ marginRight: 6 }} />
                      <Text style={[styles.adminBtnText, { color: '#EF4444' }]}>
                        {t('common.delete', 'Eliminar')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
              )}
            </ScrollView>
          )}
        </View>
      </BottomModal>

      {/* --- MODAL 2: CREAR / EDITAR LIBRO --- */}
      <BottomModal
        visible={formModalVisible}
        onClose={() => setFormModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {editingBookId ? t('library.editBook', 'Editar Libro') : t('library.newBook', 'Nuevo Libro')}
            </Text>
            <TouchableOpacity
              onPress={() => setFormModalVisible(false)}
              style={styles.modalCloseBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={22} color={isDark ? '#FFFFFF' : Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Título */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Título del libro *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ej. Cien años de soledad"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={formTitle}
                onChangeText={setFormTitle}
              />
            </View>

            {/* Autor */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Autor *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ej. Gabriel García Márquez"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={formAuthor}
                onChangeText={setFormAuthor}
              />
            </View>

            {/* Categoría */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Categoría *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.formCategoryOption,
                      formCategoryId === cat.id && styles.formCategoryOptionActive
                    ]}
                    onPress={() => setFormCategoryId(cat.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.formCategoryOptionText,
                        formCategoryId === cat.id && styles.formCategoryOptionTextActive
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Descripción / Sinopsis */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Descripción / Sinopsis *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Resumen o descripción pedagógica del contenido..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Portada (Opcional) */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>{t('library.uploadCover', 'Portada (Opcional)')}</Text>
              <View style={styles.coverPickerRow}>
                {formCoverUrl ? (
                  <Image source={{ uri: formCoverUrl }} style={styles.coverPreviewImage} resizeMode="cover" />
                ) : (
                  <View style={styles.coverPreviewEmpty}>
                    <BookOpen size={24} color={isDark ? '#64748B' : '#94A3B8'} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <TouchableOpacity style={styles.pickCoverBtn} onPress={pickCoverImage} activeOpacity={0.8}>
                    <UploadCloud size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.pickCoverBtnText}>
                      {formCoverUrl ? t('library.changeCover', 'Cambiar portada') : 'Elegir imagen de portada'}
                    </Text>
                  </TouchableOpacity>
                  {formCoverUrl ? (
                    <TouchableOpacity
                      onPress={() => { setFormCoverUrl(''); setFormCoverBase64(null); }}
                      style={{ marginTop: 6 }}
                    >
                      <Text style={styles.removeCoverText}>Quitar portada</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Selector de Tipo de Recurso: PDF o Enlace Web */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>{t('library.resourceType', 'Tipo de Recurso')} *</Text>
              <View style={styles.resourceTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.resourceTypeOption,
                    formResourceType === 'pdf' && styles.resourceTypeOptionActive
                  ]}
                  onPress={() => setFormResourceType('pdf')}
                  activeOpacity={0.8}
                >
                  <FileText size={16} color={formResourceType === 'pdf' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B')} style={{ marginRight: 6 }} />
                  <Text style={[styles.resourceTypeText, formResourceType === 'pdf' && styles.resourceTypeTextActive]}>
                    Subir PDF (≤ 20 MB)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.resourceTypeOption,
                    formResourceType === 'link' && styles.resourceTypeOptionActive
                  ]}
                  onPress={() => setFormResourceType('link')}
                  activeOpacity={0.8}
                >
                  <ExternalLink size={16} color={formResourceType === 'link' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B')} style={{ marginRight: 6 }} />
                  <Text style={[styles.resourceTypeText, formResourceType === 'link' && styles.resourceTypeTextActive]}>
                    Enlace Web (URL)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Entrada según tipo de recurso */}
            {formResourceType === 'pdf' ? (
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Archivo PDF *</Text>
                <TouchableOpacity
                  style={styles.uploadPdfBox}
                  onPress={pickPdfDocument}
                  activeOpacity={0.8}
                >
                  <FileText size={24} color="#EF4444" style={{ marginBottom: 6 }} />
                  <Text style={styles.uploadPdfBoxTitle} numberOfLines={1}>
                    {formResourceName || (formResourceUrl ? 'PDF seleccionado' : 'Toca para elegir documento PDF')}
                  </Text>
                  <Text style={styles.uploadPdfBoxSubtitle}>
                    Límite máximo: 20 MB • Formato PDF
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Enlace Externo (URL) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="https://ejemplo.com/recurso"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  value={formResourceUrl}
                  onChangeText={setFormResourceUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            )}

            {/* Mensaje de error inline para el formulario */}
            {formError ? (
              <View style={styles.formErrorBox}>
                <AlertCircle size={16} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            {/* Botón de Enviar Formulario */}
            <TouchableOpacity
              style={[styles.formSubmitBtn, submittingForm && { opacity: 0.6 }]}
              onPress={handleSaveBook}
              disabled={submittingForm}
              activeOpacity={0.85}
            >
              {submittingForm ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.formSubmitBtnText}>
                  {editingBookId ? 'Guardar Cambios' : 'Publicar en la Biblioteca'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </BottomModal>

      {/* --- MODAL 3: ADMINISTRAR CATEGORÍAS --- */}
      <BottomModal
        visible={categoryModalVisible}
        onClose={() => {
          setCategoryModalVisible(false);
          setCategoryError(null);
          setCategorySuccess(null);
          setCategoryToDelete(null);
        }}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {t('library.manageCategories', 'Categorías')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setCategoryModalVisible(false);
                setCategoryError(null);
                setCategorySuccess(null);
                setCategoryToDelete(null);
              }}
              style={styles.modalCloseBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={22} color={isDark ? '#FFFFFF' : Colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Mensajes de retroalimentación inline para categorías */}
          {categoryError ? (
            <View style={styles.categoryErrorBox}>
              <AlertCircle size={15} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.categoryErrorText}>{categoryError}</Text>
            </View>
          ) : null}

          {categorySuccess ? (
            <View style={styles.categorySuccessBox}>
              <CheckCircle2 size={15} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={styles.categorySuccessText}>{categorySuccess}</Text>
            </View>
          ) : null}

          {/* Input para agregar nueva categoría */}
          <View style={styles.addCategoryRow}>
            <TextInput
              style={styles.addCategoryInput}
              placeholder="Nueva categoría..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={newCategoryName}
              onChangeText={(text) => {
                setNewCategoryName(text);
                if (categoryError) setCategoryError(null);
              }}
              onSubmitEditing={handleCreateCategory}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addCategorySubmitBtn, submittingCategory && { opacity: 0.6 }]}
              onPress={handleCreateCategory}
              disabled={submittingCategory}
              activeOpacity={0.8}
            >
              {submittingCategory ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.addCategorySubmitBtnText}>Agregar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Listado de Categorías Existentes con scroll fluido y nestedScrollEnabled */}
          <ScrollView
            style={styles.categoryListScroll}
            contentContainerStyle={styles.categoryListScrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {categories.length === 0 ? (
              <View style={styles.emptyCategoriesBox}>
                <Text style={styles.emptyCategoriesText}>No hay categorías registradas.</Text>
              </View>
            ) : (
              categories.map(cat => (
                categoryToDelete === cat.id ? (
                  <View key={cat.id} style={styles.categoryDeleteConfirmRow}>
                    <Text style={styles.categoryDeleteConfirmText} numberOfLines={1}>
                      ¿Eliminar "{cat.name}"?
                    </Text>
                    <View style={styles.categoryDeleteActions}>
                      <TouchableOpacity
                        style={styles.categoryCancelDeleteBtn}
                        onPress={() => setCategoryToDelete(null)}
                        disabled={deletingCatId === cat.id}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.categoryCancelDeleteText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.categoryConfirmDeleteBtn}
                        onPress={() => confirmDeleteCategory(cat)}
                        disabled={deletingCatId === cat.id}
                        activeOpacity={0.7}
                      >
                        {deletingCatId === cat.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.categoryConfirmDeleteText}>Eliminar</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View key={cat.id} style={styles.categoryListItem}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.categoryListItemTitle}>{cat.name}</Text>
                      {cat.books_count !== undefined && (
                        <Text style={styles.categoryListItemCount}>
                          {cat.books_count} libro(s) asociados
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => requestDeleteCategory(cat)}
                      style={styles.deleteCategoryBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )
              ))
            )}
          </ScrollView>
        </View>
      </BottomModal>
    </View>
  );
}

const createStyles = (Colors, isDark, numColumns, cardGap) => {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: isDark ? Colors.background : '#F8FAFC',
    },

    // Zona Superior Fija (Barra de búsqueda y chips de categorías)
    stickyHeaderArea: {
      backgroundColor: isDark ? Colors.background : '#F8FAFC',
      paddingTop: 12,
      paddingBottom: 4,
      zIndex: 10,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 10,
      gap: 10,
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? Colors.card : '#FFFFFF',
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 46,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: isDark ? '#FFFFFF' : '#0F172A',
      paddingVertical: 0,
    },
    clearBtn: {
      padding: 4,
    },
    categoryManageBtn: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },

    // Filter Pills de Categorías (Estilo idéntico a Avisos)
    filterPillsWrapper: {
      paddingVertical: 6,
      backgroundColor: 'transparent',
    },
    filterPillsContainer: {
      paddingHorizontal: 16,
      gap: 8,
      flexDirection: 'row',
    },
    filterPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
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

    // Contenedor del Grid
    gridContainer: {
      flex: 1,
    },
    gridContent: {
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 100, // Espacio para que el FAB no tape la última tarjeta
    },
    gridRow: {
      justifyContent: 'space-between',
      gap: cardGap,
      marginBottom: cardGap,
    },

    // Tarjeta del libro
    bookCard: {
      flex: 1,
      backgroundColor: isDark ? Colors.card : '#FFFFFF',
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDark ? 0.25 : 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    cardCoverContainer: {
      width: '100%',
      aspectRatio: 3 / 4,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F1F5F9',
      position: 'relative',
      overflow: 'hidden',
    },
    cardCoverImage: {
      width: '100%',
      height: '100%',
    },
    cardCoverPlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 12,
    },
    cardPlaceholderLabel: {
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 8,
    },
    cardResourceBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      zIndex: 2,
    },
    resourceDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    cardInfo: {
      padding: 12,
    },
    cardCategoryBadge: {
      alignSelf: 'flex-start',
      backgroundColor: isDark ? 'rgba(2, 132, 199, 0.2)' : '#E0F2FE',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginBottom: 6,
    },
    cardCategoryText: {
      fontSize: 10,
      fontWeight: '700',
      color: isDark ? '#38BDF8' : '#0284C7',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#F8FAFC' : '#0F172A',
      lineHeight: 18,
      marginBottom: 4,
    },
    cardAuthor: {
      fontSize: 12,
      fontWeight: '500',
      color: isDark ? '#94A3B8' : '#64748B',
    },

    // Botón Flotante (FAB) idéntico a Avisos
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      zIndex: 20,
    },

    // Estados vacíos y carga
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
      fontWeight: '500',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 60,
    },
    emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#F8FAFC' : '#0F172A',
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    clearFiltersBtn: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: Colors.primary,
    },
    clearFiltersBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
    },
    footerLoader: {
      paddingVertical: 16,
      alignItems: 'center',
    },

    // Estilos de Modales (BottomModal)
    modalContent: {
      width: '100%',
      maxHeight: '100%',
      flexShrink: 1,
      display: 'flex',
      flexDirection: 'column',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 24,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F1F5F9',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#FFFFFF' : Colors.primary,
      flex: 1,
      marginRight: 10,
    },
    modalCloseBtn: {
      padding: 4,
    },
    modalScroll: {
      flexGrow: 0,
      maxHeight: 560,
    },
    modalScrollContent: {
      paddingBottom: 24,
    },

    // Modal Detalle
    detailCoverSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      gap: 16,
    },
    detailCoverImage: {
      width: 90,
      height: 120,
      borderRadius: 12,
    },
    detailCoverPlaceholder: {
      width: 90,
      height: 120,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
    },
    detailMetaBlock: {
      flex: 1,
    },
    detailTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#F8FAFC' : '#0F172A',
      marginBottom: 4,
    },
    detailAuthor: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#94A3B8' : '#64748B',
      marginBottom: 10,
    },
    detailBadgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    detailPillCategory: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(2, 132, 199, 0.2)' : '#E0F2FE',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    detailPillCategoryText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#38BDF8' : '#0284C7',
    },
    detailPillResource: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    detailPillResourceText: {
      fontSize: 11,
      fontWeight: '600',
    },
    detailSectionBox: {
      marginBottom: 20,
    },
    detailSectionHeading: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    detailDescriptionText: {
      fontSize: 15,
      color: isDark ? '#E2E8F0' : '#334155',
      lineHeight: 22,
    },
    detailActionArea: {
      marginTop: 8,
      marginBottom: 16,
    },
    primaryActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },
    primaryActionBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    adminButtonsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F1F5F9',
    },
    adminEditBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#EFF6FF',
    },
    adminDeleteBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
    },
    adminBtnText: {
      fontSize: 14,
      fontWeight: '600',
    },
    confirmDeleteBox: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
      marginTop: 10,
      alignItems: 'center',
    },
    confirmDeleteText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#FCA5A5' : '#DC2626',
      marginBottom: 12,
      textAlign: 'center',
    },
    confirmDeleteButtons: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    cancelDeleteBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelDeleteBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#E2E8F0' : '#475569',
    },
    doDeleteBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    doDeleteBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // Modal Formulario (Crear / Editar)
    formScrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    formField: {
      marginBottom: 16,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#CBD5E1' : '#334155',
      marginBottom: 6,
    },
    formInput: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    formTextArea: {
      height: 90,
      paddingTop: 10,
    },
    formCategoryOption: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
    },
    formCategoryOptionActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    formCategoryOptionText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    formCategoryOptionTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    coverPickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    coverPreviewImage: {
      width: 50,
      height: 70,
      borderRadius: 8,
    },
    coverPreviewEmpty: {
      width: 50,
      height: 70,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
    },
    pickCoverBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    pickCoverBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: Colors.primary,
    },
    removeCoverText: {
      fontSize: 11,
      color: '#EF4444',
      fontWeight: '500',
    },
    resourceTypeSelector: {
      flexDirection: 'row',
      gap: 10,
    },
    resourceTypeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
    },
    resourceTypeOptionActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    resourceTypeText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    resourceTypeTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    uploadPdfBox: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#CBD5E1',
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC',
    },
    uploadPdfBoxTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 2,
    },
    uploadPdfBoxSubtitle: {
      fontSize: 11,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    formErrorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
    },
    formErrorText: {
      fontSize: 13,
      color: '#EF4444',
      fontWeight: '500',
      flex: 1,
    },
    formSubmitBtn: {
      backgroundColor: Colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },
    formSubmitBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },

    // Modal Categorías
    categoryErrorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12,
    },
    categoryErrorText: {
      fontSize: 12,
      color: '#EF4444',
      fontWeight: '500',
      flex: 1,
    },
    categorySuccessBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12,
    },
    categorySuccessText: {
      fontSize: 12,
      color: '#10B981',
      fontWeight: '600',
      flex: 1,
    },
    addCategoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
      width: '100%',
    },
    addCategoryInput: {
      flex: 1,
      height: 46,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
      borderRadius: 12,
      paddingHorizontal: 14,
      fontSize: 14,
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    addCategorySubmitBtn: {
      height: 46,
      backgroundColor: Colors.primary,
      borderRadius: 12,
      paddingHorizontal: 18,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 85,
    },
    addCategorySubmitBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    categoryListScroll: {
      maxHeight: 340,
      minHeight: 80,
      width: '100%',
      flexGrow: 0,
      flexShrink: 1,
    },
    categoryListScrollContent: {
      paddingBottom: 28,
      flexGrow: 1,
    },
    categoryListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
    },
    categoryListItemTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? '#F8FAFC' : '#0F172A',
    },
    categoryListItemCount: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 2,
    },
    deleteCategoryBtn: {
      padding: 8,
      marginLeft: 8,
    },
    categoryDeleteConfirmRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 10,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
    },
    categoryDeleteConfirmText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#FCA5A5' : '#DC2626',
      flex: 1,
      marginRight: 8,
    },
    categoryDeleteActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    categoryCancelDeleteBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
    },
    categoryCancelDeleteText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#E2E8F0' : '#475569',
    },
    categoryConfirmDeleteBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: '#EF4444',
    },
    categoryConfirmDeleteText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    emptyCategoriesBox: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    emptyCategoriesText: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
    },
  });
};
