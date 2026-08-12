import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  FlatList
} from 'react-native';
import { 
  Utensils, 
  ShoppingBag, 
  QrCode, 
  Plus, 
  CheckCircle, 
  Clock, 
  Check, 
  Sparkles, 
  Trash2, 
  CheckSquare, 
  Square,
  Search,
  AlertCircle
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/utils/api';
import QRCodeDisplay from '../src/components/QRCodeDisplay';
import { useAlert } from '../src/context/AlertContext';
import PageHeader from '../src/components/PageHeader';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function CafetinScreen() {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const { profile } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [activeTab, setActiveTab] = useState('menu'); // 'menu', 'pedidos', 'qr'

  // --- ESTADOS MÓDULO 1: MENÚ ---
  const [catalog, setCatalog] = useState([]);
  const [publishedItemIds, setPublishedItemIds] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [publishingMenu, setPublishingMenu] = useState(false);
  const [modalAddItem, setModalAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('fuerte'); // 'fuerte', 'acompanamiento', 'refresco'
  const [newItemDesc, setNewItemDesc] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  // --- ESTADOS MÓDULO 2: PEDIDOS ---
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastTapRef = useRef({});

  // --- ESTADOS MÓDULO 3: QR SCANNER / DESPACHO ---
  const [scannedOrderId, setScannedOrderId] = useState('');
  const [scannedOrder, setScannedOrder] = useState(null);
  const [loadingScan, setLoadingScan] = useState(false);
  const [confirmingDispatch, setConfirmingDispatch] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);

  const handleOpenCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        showAlert({ type: 'warning', title: 'Permiso requerido', message: 'Se necesita acceso a la cámara para escanear códigos QR.' });
        return;
      }
    }
    scanLockRef.current = false;
    setCameraOpen(true);
  };

  const handleBarCodeScanned = ({ data }) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setCameraOpen(false);
    setScannedOrderId(data);
    handleSearchQR(data);
  };

  useEffect(() => {
    fetchMenuData();
    fetchTodayOrders();
  }, []);

  // --- CARGA DE DATOS ---
  const fetchMenuData = async () => {
    setLoadingMenu(true);
    try {
      const [catRes, pubRes] = await Promise.all([
        api.get('/cafetin/catalog'),
        api.get('/cafetin/daily-menu')
      ]);

      setCatalog(catRes.data || []);
      const pubIds = (pubRes.data || []).map(item => item.id);
      setPublishedItemIds(pubIds);
    } catch (error) {
      console.error('Error al cargar datos del menú:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los datos del catálogo y menú del día'
      });
    } finally {
      setLoadingMenu(false);
    }
  };

  const fetchTodayOrders = async (pageNum = 1) => {
    if (pageNum === 1) setLoadingOrders(true);
    else setLoadingMore(true);

    try {
      const res = await api.get('/cafetin/orders', { params: { page: pageNum, limit: 50 } });
      const { data, totalPages: fetchedTotalPages } = res.data;
      
      if (pageNum === 1) {
        setOrders(data);
      } else {
        setOrders(prev => [...prev, ...data]);
      }
      setTotalPages(fetchedTotalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
    } finally {
      setLoadingOrders(false);
      setLoadingMore(false);
      setRefreshingOrders(false);
    }
  };

  const loadMoreOrders = () => {
    if (page < totalPages && !loadingMore && !loadingOrders) {
      fetchTodayOrders(page + 1);
    }
  };

  // --- FUNCIONES MÓDULO 1: MENÚ ---
  const handleAddItemToCatalog = async () => {
    if (!newItemName.trim()) {
      showAlert({
        type: 'warning',
        title: 'Atención',
        message: 'Por favor ingresa el nombre del alimento'
      });
      return;
    }
    setAddingItem(true);
    try {
      const res = await api.post('/cafetin/catalog', {
        name: newItemName.trim(),
        category: newItemCategory,
        description: newItemDesc.trim()
      });
      setCatalog([res.data, ...catalog]);
      // Seleccionar automáticamente para el menú del día
      setPublishedItemIds([...publishedItemIds, res.data.id]);
      setModalAddItem(false);
      setNewItemName('');
      setNewItemDesc('');
      showAlert({
        type: 'success',
        title: '¡Éxito!',
        message: 'Alimento añadido al catálogo correctamente'
      });
    } catch (error) {
      console.error('Error al agregar ítem:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || 'No se pudo agregar el alimento'
      });
    } finally {
      setAddingItem(false);
    }
  };

  const togglePublishItem = (itemId) => {
    if (publishedItemIds.includes(itemId)) {
      setPublishedItemIds(publishedItemIds.filter(id => id !== itemId));
    } else {
      setPublishedItemIds([...publishedItemIds, itemId]);
    }
  };

  const handlePublishMenu = async () => {
    setPublishingMenu(true);
    try {
      await api.post('/cafetin/daily-menu', { item_ids: publishedItemIds });
      showAlert({
        type: 'success',
        title: '¡Menú Publicado!',
        message: 'El menú del día ha sido publicado exitosamente para los estudiantes y maestros.'
      });
    } catch (error) {
      console.error('Error al publicar menú:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudo publicar el menú del día'
      });
    } finally {
      setPublishingMenu(false);
    }
  };

  const handleDeleteCatalogItem = (itemId, itemName) => {
    showConfirm({
      type: 'danger',
      title: 'Confirmar eliminación',
      message: `¿Deseas eliminar "${itemName}" del catálogo?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await api.delete(`/cafetin/catalog/${itemId}`);
          setCatalog(catalog.filter(item => item.id !== itemId));
          setPublishedItemIds(publishedItemIds.filter(id => id !== itemId));
          showAlert({
            type: 'success',
            title: '¡Eliminado!',
            message: 'Alimento eliminado del catálogo.'
          });
        } catch (error) {
          showAlert({
            type: 'error',
            title: 'Error',
            message: 'No se pudo eliminar el ítem'
          });
        }
      }
    });
  };

  // --- FUNCIONES MÓDULO 2: PEDIDOS (DOBLE CLIC PARA PREPARADO) ---
  const handleCardTap = (order) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[order.id] || 0;

    if (now - lastTap < 350) { // Doble clic detectado
      handleSetOrderPrepared(order);
    }
    lastTapRef.current[order.id] = now;
  };

  const handleSetOrderPrepared = async (order) => {
    if (order.status === 'preparado') {
      showAlert({
        type: 'info',
        title: 'Información',
        message: 'El pedido ya se encuentra en estado Preparado'
      });
      return;
    }
    if (order.status === 'entregado') {
      showAlert({
        type: 'info',
        title: 'Información',
        message: 'El pedido ya fue entregado y finalizado'
      });
      return;
    }

    try {
      const res = await api.patch(`/cafetin/orders/${order.id}/status`, { status: 'preparado' });
      setOrders(orders.map(o => o.id === order.id ? { ...o, status: 'preparado' } : o));
      showAlert({
        type: 'success',
        title: '¡Pedido Preparado!',
        message: `El pedido de ${order.user?.full_name || 'Cliente'} ha sido marcado como PREPARADO.`
      });
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cambiar el estado a preparado'
      });
    }
  };

  // --- FUNCIONES MÓDULO 3: QR SCANNER ---
  const handleSearchQR = async (codeToSearch) => {
    const orderIdToQuery = (codeToSearch || scannedOrderId).trim();
    if (!orderIdToQuery) {
      showAlert({
        type: 'warning',
        title: 'Atención',
        message: 'Por favor ingresa o escanea el código del pedido'
      });
      return;
    }
    setLoadingScan(true);
    setScannedOrder(null);
    try {
      const res = await api.get(`/cafetin/orders/verify-qr/${orderIdToQuery}`);
      setScannedOrder(res.data);
    } catch (error) {
      console.error('Error al verificar QR:', error);
      showAlert({
        type: 'error',
        title: 'Pedido No Encontrado',
        message: 'El código de pedido escaneado no existe o no corresponde a este cafetín.'
      });
    } finally {
      setLoadingScan(false);
    }
  };

  const handleConfirmDispatch = async () => {
    if (!scannedOrder) return;
    setConfirmingDispatch(true);
    try {
      const res = await api.post(`/cafetin/orders/confirm-dispatch/${scannedOrder.id}`);
      showAlert({
        type: 'success',
        title: '¡Despacho Exitoso!',
        message: `El pedido de ${scannedOrder.user?.full_name} por $${Number(scannedOrder.total_price).toFixed(2)} ha sido entregado.`
      });
      setScannedOrder(null);
      setScannedOrderId('');
      fetchTodayOrders();
    } catch (error) {
      console.error('Error al confirmar despacho:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudo confirmar la entrega del pedido'
      });
    } finally {
      setConfirmingDispatch(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ordenado':
        return { label: 'Ordenado', color: '#f59e0b', bg: '#fffbeb' };
      case 'preparado':
        return { label: '¡Preparado!', color: '#10b981', bg: '#ecfdf5' };
      case 'entregado':
        return { label: 'Entregado', color: '#64748b', bg: '#f1f5f9' };
      default:
        return { label: status, color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title={t('titles.cafetin', 'Gestión Cafetín')}
        subtitle={t('home.cafetinDesc', 'Menú del día, pedidos y despacho QR')}
      />

      {/* TABS NAVEGACIÓN PRINCIPAL */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'menu' && styles.tabButtonActive]}
          onPress={() => setActiveTab('menu')}
          activeOpacity={0.8}
        >
          <Utensils size={18} color={activeTab === 'menu' ? Colors.primary : Colors.text.secondary} />
          <Text style={[styles.tabButtonText, activeTab === 'menu' && styles.tabButtonTextActive]}>
            1. Menú
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pedidos' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pedidos')}
          activeOpacity={0.8}
        >
          <ShoppingBag size={18} color={activeTab === 'pedidos' ? Colors.primary : Colors.text.secondary} />
          <Text style={[styles.tabButtonText, activeTab === 'pedidos' && styles.tabButtonTextActive]}>
            2. Pedidos ({orders.filter(o => o.status !== 'entregado').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'qr' && styles.tabButtonActive]}
          onPress={() => setActiveTab('qr')}
          activeOpacity={0.8}
        >
          <QrCode size={18} color={activeTab === 'qr' ? Colors.primary : Colors.text.secondary} />
          <Text style={[styles.tabButtonText, activeTab === 'qr' && styles.tabButtonTextActive]}>
            3. Escáner QR
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- MÓDULO 1: MENÚ --- */}
      {activeTab === 'menu' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{t('cafetin.dailyMenu', 'Menú del Día')}</Text>
              <Text style={styles.sectionSubtitle}>
                Selecciona los alimentos que tendrás disponibles hoy y presiona Publicar. Se reinicia cada día.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalAddItem(true)}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#FFF" />
              <Text style={styles.addButtonText}>{t('cafetin.addItem', 'Agregar')}</Text>
            </TouchableOpacity>
          </View>

          {loadingMenu ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {['fuerte', 'acompanamiento', 'refresco'].map((catKey) => {
                const categoryTitle = catKey === 'fuerte' ? t('lunch.chooseFuerte', 'Platillos Fuertes') : catKey === 'acompanamiento' ? t('lunch.chooseAcomp1', 'Acompañamientos') : t('lunch.chooseRefresco', 'Refrescos / Bebidas');
                const itemsInCat = catalog.filter(i => i.category === catKey);

                return (
                  <View key={catKey} style={styles.categoryBlock}>
                    <Text style={styles.categoryTitle}>{categoryTitle}</Text>
                    {itemsInCat.length === 0 ? (
                      <Text style={styles.emptyCatText}>{t('cafetin.emptyCatText', 'No hay alimentos agregados a esta categoría.')}</Text>
                    ) : (
                      itemsInCat.map((item) => {
                        const isSelected = publishedItemIds.includes(item.id);
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                            onPress={() => togglePublishItem(item.id)}
                            activeOpacity={0.75}
                          >
                            <View style={styles.checkboxContainer}>
                              {isSelected ? (
                                <CheckSquare size={22} color={Colors.primary} />
                              ) : (
                                <Square size={22} color={Colors.text.muted} />
                              )}
                            </View>

                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
                                {item.name}
                              </Text>
                              {item.description ? (
                                <Text style={styles.itemDesc}>{item.description}</Text>
                              ) : null}
                            </View>

                            <TouchableOpacity
                              onPress={() => handleDeleteCatalogItem(item.id, item.name)}
                              style={{ padding: 6 }}
                            >
                              <Trash2 size={18} color="#ef4444" />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                );
              })}

              <TouchableOpacity
                style={[styles.publishButton, publishingMenu && { opacity: 0.6 }]}
                onPress={handlePublishMenu}
                disabled={publishingMenu}
                activeOpacity={0.8}
              >
                {publishingMenu ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Sparkles size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.publishButtonText}>{t('cafetin.publishMenu', 'Publicar Menú para Hoy')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {/* --- MÓDULO 2: PEDIDOS RECIBIDOS --- */}
      {activeTab === 'pedidos' && (
        <View style={styles.content}>
          <View style={[styles.noticeBox, { marginHorizontal: 20, marginTop: 10 }]}>
            <Sparkles size={18} color={Colors.primary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>💡 Doble clic para cambiar estado</Text>
              <Text style={styles.noticeText}>
                Presiona dos veces (doble clic) rápido sobre la tarjeta de un pedido para marcarlo como PREPARADO.
              </Text>
            </View>
          </View>

          {loadingOrders ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : orders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ShoppingBag size={48} color={Colors.text.muted} />
              <Text style={styles.emptyTitle}>No hay pedidos para hoy</Text>
              <Text style={styles.emptyDesc}>Los pedidos de los usuarios aparecerán aquí en cuanto sean ordenados.</Text>
            </View>
          ) : (
            <FlatList
              data={orders}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              refreshControl={
                <RefreshControl refreshing={refreshingOrders} onRefresh={() => { setRefreshingOrders(true); fetchTodayOrders(1); }} />
              }
              onEndReached={loadMoreOrders}
              onEndReachedThreshold={0.5}
              ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={Colors.primary} style={{ margin: 20 }} /> : null}
              renderItem={({ item: order }) => {
                const badge = getStatusBadge(order.status);
                const formattedTime = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <TouchableOpacity
                    style={[styles.orderCard, order.status === 'preparado' && styles.orderCardPrepared, { marginHorizontal: 20 }]}
                    onPress={() => handleCardTap(order)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.orderCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.customerName}>{order.user?.full_name || 'Cliente'}</Text>
                        <Text style={styles.orderTime}><Clock size={12} color={Colors.text.secondary} /> {formattedTime}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    </View>

                    <View style={styles.orderItemsList}>
                      <Text style={styles.orderItemText}>• <Text style={styles.boldText}>Fuerte:</Text> {order.fuerte?.name}</Text>
                      <Text style={styles.orderItemText}>• <Text style={styles.boldText}>Acompañamiento 1:</Text> {order.acompanamiento1?.name}</Text>
                      <Text style={styles.orderItemText}>• <Text style={styles.boldText}>Acompañamiento 2:</Text> {order.acompanamiento2?.name}</Text>
                      <Text style={styles.orderItemText}>• <Text style={styles.boldText}>Tortillas:</Text> {order.tortillas_qty}</Text>
                      {order.refresco?.name ? (
                        <Text style={styles.orderItemText}>• <Text style={styles.boldText}>Refresco:</Text> {order.refresco?.name}</Text>
                      ) : null}
                    </View>

                    <View style={styles.orderCardFooter}>
                      <Text style={styles.priceLabel}>Monto total a cobrar:</Text>
                      <Text style={styles.priceValue}>${Number(order.total_price).toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}

      {/* --- MÓDULO 3: ESCÁNER QR --- */}
      {activeTab === 'qr' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.qrHeaderCard}>
            <QrCode size={36} color={Colors.primary} style={{ marginBottom: 8 }} />
            <Text style={styles.qrTitle}>Escanear o Ingresar Código QR</Text>
            <Text style={styles.qrDesc}>
              Escanea el QR del estudiante o ingresa manualmente el código de la orden.
            </Text>

            {/* BOTÓN GRANDE PARA ABRIR CÁMARA */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: Colors.primary,
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 24,
                marginTop: 16,
                marginBottom: 20,
                gap: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={handleOpenCamera}
              activeOpacity={0.8}
            >
              <Camera size={24} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
                Abrir Cámara para Escanear
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: Colors.gray[200] }} />
              <Text style={{ marginHorizontal: 12, color: Colors.text.muted, fontSize: 12 }}>o ingresa el código</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: Colors.gray[200] }} />
            </View>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Código del pedido (UUID u ID)..."
                placeholderTextColor={Colors.text.muted}
                value={scannedOrderId}
                onChangeText={setScannedOrderId}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => handleSearchQR()}
                disabled={loadingScan}
                activeOpacity={0.8}
              >
                {loadingScan ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Search size={20} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {scannedOrder && (
            <View style={styles.scannedOrderCard}>
              <View style={styles.scannedHeader}>
                <CheckCircle size={28} color="#10b981" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.scannedTitle}>Pedido Encontrado</Text>
                  <Text style={styles.scannedSubtitle}>Por favor verifica el cobro en efectivo</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cliente:</Text>
                <Text style={styles.infoValue}>{scannedOrder.user?.full_name}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Rol:</Text>
                <Text style={styles.infoValue}>{scannedOrder.user?.role?.toUpperCase()}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Platillo Fuerte:</Text>
                <Text style={styles.infoValue}>{scannedOrder.fuerte?.name}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Acompañamientos:</Text>
                <Text style={styles.infoValue}>{scannedOrder.acompanamiento1?.name}, {scannedOrder.acompanamiento2?.name}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tortillas:</Text>
                <Text style={styles.infoValue}>{scannedOrder.tortillas_qty}</Text>
              </View>

              {scannedOrder.refresco?.name ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Refresco:</Text>
                  <Text style={styles.infoValue}>{scannedOrder.refresco?.name}</Text>
                </View>
              ) : null}

              <View style={styles.amountBox}>
                <Text style={styles.amountBoxLabel}>MONTO A COBRAR EN CAJA:</Text>
                <Text style={styles.amountBoxValue}>${Number(scannedOrder.total_price).toFixed(2)}</Text>
              </View>

              {scannedOrder.status === 'entregado' ? (
                <View style={{ marginTop: 20, padding: 16, backgroundColor: '#fee2e2', borderRadius: 12, alignItems: 'center' }}>
                  <AlertCircle size={28} color="#ef4444" style={{ marginBottom: 8 }} />
                  <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 16 }}>¡ATENCIÓN!</Text>
                  <Text style={{ color: '#991b1b', textAlign: 'center', marginTop: 4 }}>
                    Este pedido ya fue marcado como ENTREGADO anteriormente. No es posible despacharlo de nuevo.
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.dispatchButton, confirmingDispatch && { opacity: 0.6 }]}
                  onPress={handleConfirmDispatch}
                  disabled={confirmingDispatch}
                  activeOpacity={0.85}
                >
                  {confirmingDispatch ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <CheckCircle size={22} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.dispatchButtonText}>Confirmar Despacho del Pedido</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* --- MODAL PARA AGREGAR ALIMENTO AL CATÁLOGO --- */}
      <Modal visible={modalAddItem} transparent animationType="slide" onRequestClose={() => setModalAddItem(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={Keyboard.dismiss} 
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Alimento al Catálogo</Text>

                  <Text style={styles.inputLabel}>Nombre del Alimento *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Pollo Encebollado"
                    placeholderTextColor={Colors.text.muted}
                    value={newItemName}
                    onChangeText={setNewItemName}
                  />

                  <Text style={styles.inputLabel}>Categoría *</Text>
                  <View style={styles.catSelectorRow}>
                    {[
                      { key: 'fuerte', label: 'Fuerte' },
                      { key: 'acompanamiento', label: 'Acompañamiento' },
                      { key: 'refresco', label: 'Refresco' }
                    ].map(cat => (
                      <TouchableOpacity
                        key={cat.key}
                        style={[styles.catOption, newItemCategory === cat.key && styles.catOptionSelected]}
                        onPress={() => setNewItemCategory(cat.key)}
                      >
                        <Text style={[styles.catOptionText, newItemCategory === cat.key && styles.catOptionTextSelected]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Descripción (Opcional)</Text>
                  <TextInput
                    style={[styles.input, { height: 70 }]}
                    placeholder="Ej: Incluye salsa criolla..."
                    placeholderTextColor={Colors.text.muted}
                    multiline
                    value={newItemDesc}
                    onChangeText={setNewItemDesc}
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalAddItem(false)}>
                      <Text style={styles.cancelBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, addingItem && { opacity: 0.6 }]}
                      onPress={handleAddItemToCatalog}
                      disabled={addingItem}
                    >
                      {addingItem ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- MODAL CÁMARA QR --- */}
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: 60,
            paddingHorizontal: 20,
            paddingBottom: 16,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
          }}>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Escanea el Código QR</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>Apunta la cámara al QR del pedido</Text>
          </View>
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: 50,
            paddingTop: 20,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
          }}>
            <TouchableOpacity
              onPress={() => setCameraOpen(false)}
              style={{
                backgroundColor: '#EF4444',
                paddingVertical: 14,
                paddingHorizontal: 40,
                borderRadius: 30,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: theme === 'dark' ? Colors.card : '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabButtonActive: {
    borderBottomColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  tabButtonTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  categoryBlock: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingLeft: 8,
  },
  emptyCatText: {
    fontSize: 12,
    color: Colors.text.muted,
    fontStyle: 'italic',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  itemCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: theme === 'dark' ? Colors.primary + '15' : '#f0f9ff',
  },
  checkboxContainer: {
    padding: 2,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  itemNameSelected: {
    color: Colors.primary,
    fontWeight: '800',
  },
  itemDesc: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 40,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  publishButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? Colors.primary + '20' : '#eff6ff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  noticeText: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 30,
  },
  orderCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderCardPrepared: {
    borderColor: '#10b981',
    borderWidth: 2,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  orderTime: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  orderItemsList: {
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc',
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  orderItemText: {
    fontSize: 13,
    color: Colors.text.primary,
  },
  boldText: {
    fontWeight: '700',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
  },
  qrHeaderCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[200],
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  qrDesc: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.text.primary,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  scannedOrderCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#10b981',
    marginBottom: 40,
  },
  scannedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scannedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  scannedSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray[200],
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  amountBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  amountBoxLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.8,
  },
  amountBoxValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#047857',
    marginTop: 2,
  },
  dispatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  dispatchButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 14,
  },
  catSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  catOption: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
    borderRadius: 10,
    alignItems: 'center',
  },
  catOptionSelected: {
    backgroundColor: Colors.primary,
  },
  catOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  catOptionTextSelected: {
    color: '#FFF',
    fontWeight: '800',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.gray[200],
  },
  cancelBtnText: {
    color: Colors.text.primary,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
  }
});
