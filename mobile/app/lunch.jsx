import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Pressable,
  Keyboard
} from 'react-native';
import { 
  Store, 
  Clock, 
  CheckCircle, 
  Sparkles, 
  ChevronRight,
  Info,
  Trash2,
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Minus,
  UtensilsCrossed
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/utils/api';
import QRCodeDisplay from '../src/components/QRCodeDisplay';
import { useAlert } from '../src/context/AlertContext';
import { SkeletonCard } from '../src/components/Skeleton';
import { hapticLight, hapticSuccess, hapticWarning } from '../src/utils/haptics';

const cleanLabel = (text) => (text || '').replace(/:+$/, '').trim();

export default function LunchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const { profile } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const { width } = useWindowDimensions();
  const isDark = theme === 'dark';
  const styles = React.useMemo(() => createStyles(Colors, theme, width), [Colors, theme, width]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estado si el usuario ya realizó su pedido del día
  const [existingOrder, setExistingOrder] = useState(null);

  // Estados para el flujo de selección de pedido
  const [cafetines, setCafetines] = useState([]);
  const [selectedCafetin, setSelectedCafetin] = useState(null);
  const [dailyMenu, setDailyMenu] = useState({ fuertes: [], acompanamientos: [], refrescos: [] });
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Selecciones del menú
  const [selectedFuerte, setSelectedFuerte] = useState(null);
  const [selectedAcomp1, setSelectedAcomp1] = useState(null);
  const [selectedAcomp2, setSelectedAcomp2] = useState(null);
  const [tortillasQty, setTortillasQty] = useState(1); // Default 1 (1, 2, 0)
  const [selectedRefresco, setSelectedRefresco] = useState(null); // Opcional

  // Modal de confirmación final
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  useEffect(() => {
    checkTodayOrderAndFetchCafetines();
  }, []);

  const checkTodayOrderAndFetchCafetines = async () => {
    setLoading(true);
    try {
      // 1. Cargar cafetines disponibles
      try {
        const cafRes = await api.get('/lunch/cafetines');
        setCafetines(cafRes.data || []);
      } catch (cafErr) {
        console.error('Error al cargar cafetines:', cafErr);
      }

      // 2. Verificar si ya tiene pedido hoy
      try {
        const orderRes = await api.get('/lunch/my-today-order');
        if (orderRes.data) {
          setExistingOrder(orderRes.data);
        } else {
          setExistingOrder(null);
        }
      } catch (ordErr) {
        if (ordErr.response?.status !== 404) {
          console.error('Error al consultar pedido del día:', ordErr);
        }
        setExistingOrder(null);
      }
    } catch (error) {
      console.error('Error al inicializar módulo de almuerzos:', error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: t('lunch.loadingError', 'No se pudieron cargar los datos de almuerzos')
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSelectCafetin = async (cafetin) => {
    hapticLight();
    setSelectedCafetin(cafetin);
    setSelectedFuerte(null);
    setSelectedAcomp1(null);
    setSelectedAcomp2(null);
    setSelectedRefresco(null);
    setTortillasQty(1);
    setLoadingMenu(true);

    try {
      const res = await api.get(`/lunch/cafetines/${cafetin.id}/menu`);
      setDailyMenu(res.data || { fuertes: [], acompanamientos: [], refrescos: [] });
    } catch (error) {
      console.error('Error al cargar menú del cafetín:', error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: t('lunch.menuError', 'No se pudo cargar el menú publicado para este cafetín')
      });
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleOpenConfirmModal = () => {
    if (!selectedCafetin) {
      showAlert({
        type: 'warning',
        title: t('dashboard.warning', 'Atención'),
        message: t('lunch.selectCafetinAlert', 'Por favor selecciona un cafetín')
      });
      return;
    }
    if (!selectedFuerte) {
      showAlert({
        type: 'warning',
        title: t('dashboard.warning', 'Campo Obligatorio'),
        message: t('lunch.selectFuerteAlert', 'Debes seleccionar un Platillo Fuerte')
      });
      return;
    }
    if (!selectedAcomp1) {
      showAlert({
        type: 'warning',
        title: t('dashboard.warning', 'Campo Obligatorio'),
        message: t('lunch.selectAcomp1Alert', 'Debes seleccionar el Acompañamiento 1')
      });
      return;
    }
    if (!selectedAcomp2) {
      showAlert({
        type: 'warning',
        title: t('dashboard.warning', 'Campo Obligatorio'),
        message: t('lunch.selectAcomp2Alert', 'Debes seleccionar el Acompañamiento 2')
      });
      return;
    }

    hapticLight();
    setConfirmModalVisible(true);
  };

  const handleFinalizeOrder = async () => {
    setSubmittingOrder(true);
    try {
      const payload = {
        cafetin_id: selectedCafetin.id,
        fuerte_item_id: selectedFuerte.id,
        acompanamiento1_item_id: selectedAcomp1.id,
        acompanamiento2_item_id: selectedAcomp2.id,
        tortillas_qty: tortillasQty,
        refresco_item_id: selectedRefresco ? selectedRefresco.id : null
      };

      const res = await api.post('/lunch/orders', payload);
      setConfirmModalVisible(false);
      setExistingOrder(res.data);
      hapticSuccess();
      if (Platform.OS !== 'web') Keyboard.dismiss();
      setTimeout(() => {
        showAlert({
          type: 'success',
          title: t('lunch.orderPlacedTitle', '¡Pedido Exitoso!'),
          message: t('lunch.orderPlacedMsg', 'Tu pedido de almuerzo ha sido registrado. Presenta tu código QR en el cafetín para retirar y pagar.')
        });
      }, Platform.OS === 'web' ? 50 : 350);
    } catch (error) {
      console.error('Error al realizar el pedido:', error);
      hapticWarning();
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: error.response?.data?.error || t('lunch.orderError', 'No se pudo procesar tu pedido')
      });
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleCancelOrder = async () => {
    showConfirm({
      title: 'Cancelar Pedido',
      message: '¿Estás seguro de que deseas cancelar tu pedido de almuerzo? Podrás realizar uno nuevo inmediatamente.',
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.delete('/lunch/my-today-order');
          setExistingOrder(null);
          setSelectedCafetin(null);
          hapticSuccess();
          showAlert({
            type: 'success',
            title: t('lunch.orderCancelledTitle', 'Pedido Cancelado'),
            message: t('lunch.orderCancelledSuccess', 'Tu pedido ha sido cancelado. Ahora puedes realizar un nuevo encargo.')
          });
          await checkTodayOrderAndFetchCafetines();
        } catch (error) {
          console.error('Error al cancelar pedido:', error);
          hapticWarning();
          showAlert({
            type: 'error',
            title: t('common.error', 'Error'),
            message: error.response?.data?.error || t('lunch.orderError', 'No se pudo cancelar el pedido.')
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const calculatedTotal = selectedRefresco ? 2.75 : 2.50;

  if (loading) {
    return (
      <View style={styles.flex1}>
        <View style={styles.topBanner}>
          <View style={styles.bannerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{t('lunch.title', 'Encargos de almuerzo')}</Text>
              <Text style={styles.bannerSubtitle}>{t('lunch.subtitle', 'Pre-pedido y código QR de retiro')}</Text>
            </View>
          </View>
        </View>
        <ScrollView 
          style={{ padding: 16 }} 
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </View>
    );
  }

  // --- VISTA 3: PEDIDO YA REALIZADO (IMAGEN 4) ---
  if (existingOrder) {
    return (
      <View style={styles.flex1}>
        <View style={styles.topBanner}>
          <View style={styles.bannerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{t('lunch.title', 'Encargos de almuerzo')}</Text>
              <Text style={styles.bannerSubtitle}>{t('lunch.subtitle', 'Pre-pedido y código QR de retiro')}</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); checkTodayOrderAndFetchCafetines(); }} />
          }
        >
          {/* Card 1: Estado del Pedido */}
          <View style={styles.orderStatusCard}>
            <Text style={styles.orderStatusTitle}>
              {existingOrder.status === 'entregado'
                ? t('lunch.orderDelivered', 'Almuerzo Entregado')
                : existingOrder.status === 'preparado'
                ? t('lunch.orderPrepared', '¡Tu almuerzo está PREPARADO!')
                : t('lunch.orderReceived', 'Pedido recibido')}
            </Text>
            <Text style={styles.orderStatusSubtitle}>
              {existingOrder.status === 'entregado'
                ? t('lunch.deliveredDesc', 'Has retirado con éxito tu almuerzo de hoy.')
                : existingOrder.status === 'preparado'
                ? t('lunch.preparedDesc', 'Pasa al cafetín con tu código QR para pagar y recoger.')
                : t('lunch.receivedDesc', 'En espera de que el cafetín prepare tu plato.')}
            </Text>
          </View>

          {/* Card 2: Código QR de retiro */}
          <View style={styles.qrCodeCard}>
            <Text style={styles.qrCardTitle}>{t('lunch.qrCodeTitle', 'Codigo QR de retiro')}</Text>
            <Text style={styles.qrCardSubtitle}>{t('lunch.qrCodeSub', 'Muestra este código al personal del cafetín')}</Text>
            
            <View style={styles.qrWrapper}>
              <QRCodeDisplay 
                value={existingOrder.id} 
                size={180} 
                color={Colors.primary || '#0B1956'} 
                backgroundColor="#FFFFFF" 
              />
            </View>
          </View>

          {/* Card 3: Resumen del Almuerzo (Tarjeta suave lavanda/rosa) */}
          <View style={styles.orderSummaryCard}>
            <Text style={styles.orderSummaryTitle}>{t('lunch.orderSummary', 'Resumen del Almuerzo')}</Text>
            
            <View style={styles.summaryList}>
              <Text style={styles.summaryLine}>
                <Text style={styles.summaryLineBold}>{cleanLabel(t('lunch.cafetinLabel', 'Cafetín'))}: </Text>
                {existingOrder.cafetin?.full_name}
              </Text>
              <Text style={styles.summaryLine}>
                <Text style={styles.summaryLineBold}>{cleanLabel(t('lunch.platillo', 'Platillo Fuerte'))}: </Text>
                {existingOrder.fuerte?.name}
              </Text>
              <Text style={styles.summaryLine}>
                <Text style={styles.summaryLineBold}>{cleanLabel(t('lunch.acomp1', 'Acompañamiento 1'))}: </Text>
                {existingOrder.acompanamiento1?.name}
              </Text>
              <Text style={styles.summaryLine}>
                <Text style={styles.summaryLineBold}>{cleanLabel(t('lunch.acomp2', 'Acompañamiento 2'))}: </Text>
                {existingOrder.acompanamiento2?.name}
              </Text>
              <Text style={styles.summaryLine}>
                <Text style={styles.summaryLineBold}>{cleanLabel(t('lunch.tortillas', 'Cantidad de Tortillas'))}: </Text>
                {existingOrder.tortillas_qty}
              </Text>
              {existingOrder.refresco?.name ? (
                <Text style={styles.summaryLine}>
                  <Text style={styles.summaryLineBold}>{cleanLabel(t('lunch.bebida', 'Refresco'))} (+ $0.25): </Text>
                  {existingOrder.refresco?.name}
                </Text>
              ) : null}
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>{t('lunch.totalToPay', 'Total a pagar')}:</Text>
              <Text style={styles.summaryTotalValue}>
                ${Number(existingOrder.total_price).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Botón para cancelar pedido si aún no está entregado */}
          {existingOrder.status !== 'entregado' && (
            <TouchableOpacity 
              style={styles.cancelOrderBtn}
              onPress={handleCancelOrder}
              activeOpacity={0.8}
            >
              <Trash2 size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.cancelOrderBtnText}>
                {t('lunch.cancelTodayOrder', 'Cancelar mi pedido del día')}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // --- VISTA 1: PASO 1 ARMA TU ALMUERZO (IMAGEN 2) ---
  if (selectedCafetin) {
    return (
      <View style={styles.flex1}>
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Encabezado Paso 1 con Botón de Regreso */}
          <View style={styles.step1Header}>
            <TouchableOpacity 
              style={styles.step1BackBtn} 
              onPress={() => setSelectedCafetin(null)}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={isDark ? Colors.text.primary : '#111827'} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.step1Title}>{t('lunch.step1BuildLunch', 'Paso 1. Arma tu almuerzo')}</Text>
              <Text style={styles.step1CafetinSubtitle}>{selectedCafetin.full_name}</Text>
            </View>
          </View>

          {loadingMenu ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 40 }} />
          ) : dailyMenu.fuertes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Info size={36} color={Colors.primary} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { fontWeight: '700', color: Colors.text.primary }]}>
                {t('lunch.menuNotPublishedTitle', 'Menú no publicado')}
              </Text>
              <Text style={[styles.emptyText, { marginTop: 6, lineHeight: 18 }]}>
                {t('lunch.menuNotPublishedDesc', 'El cafetín ({{cafetin}}) aún no ha publicado las opciones del menú para hoy. Los encargos estarán disponibles cuando el cafetín publique.', { cafetin: selectedCafetin.full_name })}
              </Text>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { marginTop: 16 }]}
                onPress={() => setSelectedCafetin(null)}
              >
                <Text style={styles.modalCancelBtnText}>{t('lunch.chooseAnotherCafetin', 'Elegir otro cafetín')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Card 1: Platillo Fuerte */}
              <View style={styles.bentoCard}>
                <Text style={styles.bentoCardTitle}>{t('lunch.chooseFuerte', 'Platillo fuerte')}</Text>
                {dailyMenu.fuertes.map(item => {
                  const isSelected = selectedFuerte?.id === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.radioItemBox, isSelected && styles.radioItemBoxSelected]}
                      onPress={() => { hapticLight(); setSelectedFuerte(item); }}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.radioItemText, isSelected && styles.radioItemTextSelected]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Card 2: Acompañamiento 1 */}
              <View style={styles.bentoCard}>
                <Text style={styles.bentoCardTitle}>{t('lunch.chooseAcomp1', 'Acompañamiento 1')}</Text>
                {dailyMenu.acompanamientos.length === 0 ? (
                  <Text style={styles.noItemsText}>{t('lunch.noAcompsToday', 'No hay acompañamientos disponibles hoy.')}</Text>
                ) : (
                  dailyMenu.acompanamientos.map(item => {
                    const isSelected = selectedAcomp1?.id === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.radioItemBox, isSelected && styles.radioItemBoxSelected]}
                        onPress={() => { hapticLight(); setSelectedAcomp1(item); }}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <Text style={[styles.radioItemText, isSelected && styles.radioItemTextSelected]}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              {/* Card 3: Acompañamiento 2 */}
              <View style={styles.bentoCard}>
                <Text style={styles.bentoCardTitle}>{t('lunch.chooseAcomp2', 'Acompañamiento 2')}</Text>
                {dailyMenu.acompanamientos.length === 0 ? (
                  <Text style={styles.noItemsText}>{t('lunch.noAcompsToday', 'No hay acompañamientos disponibles hoy.')}</Text>
                ) : (
                  dailyMenu.acompanamientos.map(item => {
                    const isSelected = selectedAcomp2?.id === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.radioItemBox, isSelected && styles.radioItemBoxSelected]}
                        onPress={() => { hapticLight(); setSelectedAcomp2(item); }}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <Text style={[styles.radioItemText, isSelected && styles.radioItemTextSelected]}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              {/* Card 4: Cantidad de tortillas */}
              {/* Card 4: Cantidad de tortillas (Contador interactivo de 0 a 2) */}
              <View style={styles.bentoCard}>
                <View style={styles.tortillaHeaderRow}>
                  <Text style={[styles.bentoCardTitle, { marginBottom: 0 }]}>
                    {t('lunch.tortillas', 'Cantidad de tortillas')}
                  </Text>
                  <View style={[
                    styles.tortillaBadge,
                    { 
                      backgroundColor: tortillasQty === 0 ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2') : (isDark ? 'rgba(236, 72, 153, 0.15)' : '#FDF2F8'),
                      borderColor: tortillasQty === 0 ? (isDark ? '#EF4444' : '#FCA5A5') : (isDark ? '#EC4899' : '#F472B6')
                    }
                  ]}>
                    <Text style={[
                      styles.tortillaBadgeText,
                      { color: tortillasQty === 0 ? '#EF4444' : (isDark ? '#F472B6' : '#BE185D') }
                    ]}>
                      {tortillasQty === 0 
                        ? t('lunch.noTortillas', 'Sin tortillas') 
                        : tortillasQty === 1 
                          ? '1 tortilla' 
                          : '2 tortillas'}
                    </Text>
                  </View>
                </View>

                {/* Stepper interactivo con botones [-] y [+] */}
                <View style={styles.counterBox}>
                  <TouchableOpacity
                    style={[styles.counterBtn, tortillasQty <= 0 && styles.counterBtnDisabled]}
                    onPress={() => {
                      if (tortillasQty > 0) {
                        hapticLight();
                        setTortillasQty(prev => Math.max(0, prev - 1));
                      }
                    }}
                    disabled={tortillasQty <= 0}
                    activeOpacity={0.7}
                    accessibilityLabel="Reducir cantidad de tortillas"
                  >
                    <Minus size={22} color={tortillasQty <= 0 ? (isDark ? '#52525B' : '#CBD5E1') : (isDark ? '#FFFFFF' : '#0B1956')} />
                  </TouchableOpacity>

                  <View style={styles.counterCenter}>
                    <Text style={styles.counterValue}>{tortillasQty}</Text>
                    <Text style={styles.counterDesc}>
                      {tortillasQty === 0 
                        ? t('lunch.noTortillas', 'Sin tortillas') 
                        : tortillasQty === 1 
                          ? '1 unidad' 
                          : '2 unidades (Máx)'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.counterBtn, tortillasQty >= 2 && styles.counterBtnDisabled]}
                    onPress={() => {
                      if (tortillasQty < 2) {
                        hapticLight();
                        setTortillasQty(prev => Math.min(2, prev + 1));
                      }
                    }}
                    disabled={tortillasQty >= 2}
                    activeOpacity={0.7}
                    accessibilityLabel="Aumentar cantidad de tortillas"
                  >
                    <Plus size={22} color={tortillasQty >= 2 ? (isDark ? '#52525B' : '#CBD5E1') : (isDark ? '#FFFFFF' : '#0B1956')} />
                  </TouchableOpacity>
                </View>

                {/* Chips de selección rápida: 0, 1, 2 */}
                <View style={styles.quickPillsRow}>
                  {[0, 1, 2].map(qty => {
                    const isSelected = tortillasQty === qty;
                    const pillTitle = qty === 0 
                      ? '0 (Ninguna)' 
                      : qty === 1 
                        ? '1 Tortilla' 
                        : '2 Tortillas';

                    return (
                      <TouchableOpacity
                        key={qty}
                        style={[styles.quickPill, isSelected && styles.quickPillSelected]}
                        onPress={() => {
                          hapticLight();
                          setTortillasQty(qty);
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.quickPillText, isSelected && styles.quickPillTextSelected]}>
                          {pillTitle}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Card 5: Refresco (opcional + $0.25) */}
              <View style={styles.bentoCard}>
                <Text style={styles.bentoCardTitle}>
                  Refresco (opcional + <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>$0.25</Text>)
                </Text>
                <TouchableOpacity
                  style={[styles.radioItemBox, selectedRefresco === null && styles.radioItemBoxSelected]}
                  onPress={() => { hapticLight(); setSelectedRefresco(null); }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.radioCircle, selectedRefresco === null && styles.radioCircleSelected]}>
                    {selectedRefresco === null && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.radioItemText, selectedRefresco === null && styles.radioItemTextSelected]}>
                    {t('lunch.noDrink', 'Sin refresco')}
                  </Text>
                </TouchableOpacity>

                {dailyMenu.refrescos.map(item => {
                  const isSelected = selectedRefresco?.id === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.radioItemBox, isSelected && styles.radioItemBoxSelected]}
                      onPress={() => { hapticLight(); setSelectedRefresco(item); }}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.radioItemText, isSelected && styles.radioItemTextSelected]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Barra inferior: Total a pagar y Finalizar pedido */}
              <View style={styles.bottomTotalBar}>
                <View>
                  <Text style={styles.bottomTotalLabel}>{t('lunch.totalToPay', 'Total a pagar')}:</Text>
                  <Text style={styles.bottomTotalAmount}>${calculatedTotal.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.finalizeOrderBtn}
                  onPress={handleOpenConfirmModal}
                  activeOpacity={0.85}
                >
                  <Text style={styles.finalizeOrderBtnText}>{t('lunch.finalizeOrder', 'Finalizar pedido')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        {/* --- MODAL DE CONFIRMACIÓN MODERNO --- */}
        <Modal
          transparent
          visible={confirmModalVisible}
          animationType="fade"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={() => {
            if (!submittingOrder) setConfirmModalVisible(false);
          }}
        >
          <View style={styles.confirmModalOverlay}>
            <Pressable 
              style={StyleSheet.absoluteFillObject}
              onPress={() => {
                if (!submittingOrder) setConfirmModalVisible(false);
              }}
              accessibilityLabel={t('common.close', 'Cerrar')}
            />

            <View style={styles.confirmModalCard}>
              {/* Badge con ícono UtensilsCrossed con doble aro brillante */}
              <View style={styles.confirmBadgeOuter}>
                <View style={styles.confirmBadgeInner}>
                  <UtensilsCrossed size={30} color={isDark ? '#60A5FA' : '#2563EB'} strokeWidth={2.3} />
                </View>
              </View>

              <Text style={styles.confirmModalTitle}>
                {t('lunch.confirmTitle', 'Confirmar pedido de almuerzo')}
              </Text>
              <Text style={styles.confirmModalSubtitle}>
                {t('lunch.confirmSubtitle', 'Verifica los detalles de tu combo antes de enviar la orden')}
              </Text>

              {/* Recuadro de detalles estructurado sin colones dobles */}
              <View style={styles.confirmDetailBox}>
                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmDetailLabel}>
                    {cleanLabel(t('lunch.cafetinLabel', 'Cafetín'))}
                  </Text>
                  <Text style={styles.confirmDetailValue} numberOfLines={1}>
                    {selectedCafetin?.full_name}
                  </Text>
                </View>

                <View style={styles.confirmDetailDivider} />

                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmDetailLabel}>
                    {cleanLabel(t('lunch.platillo', 'Platillo Fuerte'))}
                  </Text>
                  <Text style={styles.confirmDetailValue} numberOfLines={1}>
                    {selectedFuerte?.name}
                  </Text>
                </View>

                <View style={styles.confirmDetailDivider} />

                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmDetailLabel}>
                    {cleanLabel(t('lunch.acomp1', 'Acompañamiento 1'))}
                  </Text>
                  <Text style={styles.confirmDetailValue} numberOfLines={1}>
                    {selectedAcomp1?.name}
                  </Text>
                </View>

                <View style={styles.confirmDetailDivider} />

                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmDetailLabel}>
                    {cleanLabel(t('lunch.acomp2', 'Acompañamiento 2'))}
                  </Text>
                  <Text style={styles.confirmDetailValue} numberOfLines={1}>
                    {selectedAcomp2?.name}
                  </Text>
                </View>

                <View style={styles.confirmDetailDivider} />

                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmDetailLabel}>
                    {cleanLabel(t('lunch.tortillas', 'Cantidad de Tortillas'))}
                  </Text>
                  <Text style={styles.confirmDetailValue}>
                    {tortillasQty} {tortillasQty === 1 ? t('lunch.tortillaSingle', 'unidad') : t('lunch.tortillasPlural', 'unidades')}
                  </Text>
                </View>

                {selectedRefresco ? (
                  <>
                    <View style={styles.confirmDetailDivider} />
                    <View style={styles.confirmDetailRow}>
                      <Text style={styles.confirmDetailLabel}>
                        {cleanLabel(t('lunch.bebida', 'Refresco'))}
                      </Text>
                      <Text style={styles.confirmDetailValue} numberOfLines={1}>
                        {selectedRefresco.name} (+$0.25)
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>

              {/* Banner de aviso de pago con precio total destacado */}
              <View style={styles.confirmPaymentBanner}>
                <View style={styles.confirmPaymentHeader}>
                  <Info size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
                  <Text style={styles.confirmPaymentNotice}>
                    {t('lunch.paymentNoticePickupOnly', 'Se pagará al momento de retirar en cafetín')}
                  </Text>
                </View>
                <View style={styles.confirmPaymentPriceRow}>
                  <Text style={styles.confirmPaymentPriceLabel}>
                    {t('lunch.totalToPay', 'Total a pagar')}:
                  </Text>
                  <Text style={styles.confirmPaymentPriceValue}>
                    ${calculatedTotal.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Botones de acción */}
              <View style={styles.confirmActionsRow}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={() => setConfirmModalVisible(false)}
                  disabled={submittingOrder}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmCancelBtnText}>
                    {t('common.cancel', 'Cancelar')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmSubmitBtn, submittingOrder && { opacity: 0.6 }]}
                  onPress={handleFinalizeOrder}
                  disabled={submittingOrder}
                  activeOpacity={0.85}
                >
                  {submittingOrder ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmSubmitBtnText}>
                      {t('lunch.confirmBtn', 'Confirmar Almuerzo')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // --- VISTA 0: CUADRÍCULA DE CAFETINES (IMAGEN 1) ---
  return (
    <View style={styles.flex1}>
      <View style={styles.topBanner}>
        <View style={styles.bannerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{t('lunch.title', 'Encargos de almuerzo')}</Text>
            <Text style={styles.bannerSubtitle}>{t('lunch.subtitle', 'Pre-pedido y código QR de retiro')}</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); checkTodayOrderAndFetchCafetines(); }} />
        }
      >
        <Text style={styles.sectionHeaderTitle}>{t('lunch.wantSomethingDelicious', '¿Quieres algo delicioso?')}</Text>

        {cafetines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Store size={36} color={Colors.text.muted} />
            <Text style={styles.emptyText}>{t('lunch.noCafetinesAvailable', 'No hay cafetines disponibles en este momento.')}</Text>
          </View>
        ) : (
          <View style={styles.cafetinesGrid}>
            {cafetines.map(cafetin => (
              <TouchableOpacity
                key={cafetin.id}
                style={styles.gridCard}
                onPress={() => handleSelectCafetin(cafetin)}
                activeOpacity={0.8}
              >
                <Text style={styles.gridCardTitle} numberOfLines={2}>
                  {cafetin.full_name}
                </Text>
                <View style={styles.gridCardArrowBtn}>
                  <ArrowRight size={16} color={isDark ? Colors.text.primary : '#1E293B'} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors, theme, screenWidth) => {
  const isDark = theme === 'dark';
  const cardBorderColor = isDark ? '#3F3F46' : '#27272A';
  const pinkBg = isDark ? 'rgba(244, 114, 182, 0.12)' : '#FDF2F8';
  const pinkBorder = '#F472B6';
  const pinkCircleBorder = '#EC4899';
  const pinkDot = '#EC4899';
  const summaryCardBg = isDark ? '#261324' : '#fae8ff';
  const summaryCardBorder = isDark ? '#701a75' : '#27272A';

  return StyleSheet.create({
    flex1: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },

    // --- ENCABEZADO BANNER (IMÁGENES 1 & 4) ---
    topBanner: {
      backgroundColor: isDark ? '#18181B' : (Colors.primary || '#0B1956'),
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 18 : 22,
      paddingBottom: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
    },
    bannerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bannerBackBtn: {
      marginRight: 14,
      padding: 4,
    },
    bannerTitle: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    bannerSubtitle: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 12,
      marginTop: 2,
      fontWeight: '500',
    },

    // --- VISTA 0: GRID DE CAFETINES (IMAGEN 1) ---
    sectionHeaderTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: isDark ? Colors.text.primary : '#111827',
      marginTop: 6,
      marginBottom: 20,
      letterSpacing: -0.4,
    },
    cafetinesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
    },
    gridCard: {
      width: (screenWidth > 600) ? '31%' : '48%',
      height: 155,
      backgroundColor: Colors.card,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: cardBorderColor,
      padding: 14,
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    gridCardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? Colors.text.primary : '#1E293B',
      lineHeight: 18,
    },
    gridCardArrowBtn: {
      alignSelf: 'flex-end',
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: cardBorderColor,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.card,
    },

    // --- VISTA 1: PASO 1 (IMAGEN 2) ---
    step1Header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
      marginTop: 4,
    },
    step1BackBtn: {
      marginRight: 12,
      padding: 4,
    },
    step1Title: {
      fontSize: 22,
      fontWeight: '900',
      color: isDark ? Colors.text.primary : '#111827',
      letterSpacing: -0.4,
    },
    step1CafetinSubtitle: {
      fontSize: 12,
      color: Colors.text.muted,
      marginTop: 1,
      fontWeight: '500',
    },
    bentoCard: {
      backgroundColor: Colors.card,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: cardBorderColor,
      padding: 14,
      marginBottom: 14,
    },
    bentoCardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? Colors.text.secondary : '#334155',
      marginBottom: 10,
    },
    // Stepper de tortillas (Contador 0 a 2)
    tortillaHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    tortillaBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
    },
    tortillaBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    counterBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#18181B' : '#F8FAFC',
      borderWidth: 1.2,
      borderColor: isDark ? '#3F3F46' : '#E2E8F0',
      borderRadius: 14,
      padding: 8,
      marginBottom: 10,
    },
    counterBtn: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: isDark ? '#27272A' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    counterBtnDisabled: {
      opacity: 0.35,
      backgroundColor: isDark ? '#18181B' : '#F1F5F9',
      borderColor: 'transparent',
      elevation: 0,
    },
    counterCenter: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    counterValue: {
      fontSize: 26,
      fontWeight: 'bold',
      color: isDark ? '#FFFFFF' : '#0B1956',
      lineHeight: 30,
    },
    counterDesc: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    quickPillsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    quickPill: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: isDark ? '#3F3F46' : '#E2E8F0',
      backgroundColor: isDark ? '#18181B' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickPillSelected: {
      borderColor: pinkBorder,
      backgroundColor: pinkBg,
    },
    quickPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    quickPillTextSelected: {
      color: isDark ? Colors.text.primary : '#0B1956',
      fontWeight: 'bold',
    },
    radioItemBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.2,
      borderColor: isDark ? '#3F3F46' : '#E2E8F0',
      backgroundColor: isDark ? '#18181B' : '#FFFFFF',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 8,
    },
    radioItemBoxSelected: {
      borderColor: pinkBorder,
      backgroundColor: pinkBg,
    },
    radioCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: isDark ? '#71717A' : '#94A3B8',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    radioCircleSelected: {
      borderColor: pinkCircleBorder,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: pinkDot,
    },
    radioItemText: {
      fontSize: 13,
      color: isDark ? Colors.text.primary : '#1E293B',
      flex: 1,
    },
    radioItemTextSelected: {
      color: isDark ? Colors.text.primary : '#1E293B',
      fontWeight: '600',
    },
    noItemsText: {
      fontSize: 12,
      color: Colors.text.muted,
      fontStyle: 'italic',
      marginVertical: 4,
    },

    // Barra de Total inferior (Imagen 2)
    bottomTotalBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: Colors.card,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: cardBorderColor,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginTop: 4,
      marginBottom: 30,
    },
    bottomTotalLabel: {
      fontSize: 12,
      color: isDark ? Colors.text.secondary : '#64748B',
      fontWeight: '500',
    },
    bottomTotalAmount: {
      fontSize: 18,
      fontWeight: '900',
      color: '#16a34a',
      marginTop: 2,
    },
    finalizeOrderBtn: {
      backgroundColor: Colors.primary || '#132361',
      paddingVertical: 10,
      paddingHorizontal: 22,
      borderRadius: 22,
    },
    finalizeOrderBtnText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 14,
    },

    // --- VISTA 2: MODAL DE CONFIRMACIÓN MODERNO ---
    confirmModalOverlay: {
      flex: 1,
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.68)',
      paddingHorizontal: 20,
      zIndex: 999999,
      elevation: 999999,
      ...(Platform.OS === 'web' && {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
      }),
    },
    confirmModalCard: {
      width: '100%',
      maxWidth: 390,
      backgroundColor: Colors.card || (isDark ? '#1E293B' : '#FFFFFF'),
      borderRadius: 28,
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: isDark ? 0.4 : 0.14,
      shadowRadius: 28,
      elevation: 12,
    },
    confirmBadgeOuter: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    confirmBadgeInner: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE',
      justifyContent: 'center',
      alignItems: 'center',
    },
    confirmModalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: Colors.text.primary || (isDark ? '#F8FAFC' : '#0F172A'),
      textAlign: 'center',
      marginBottom: 4,
      letterSpacing: -0.3,
    },
    confirmModalSubtitle: {
      fontSize: 13,
      color: Colors.text.secondary || (isDark ? '#94A3B8' : '#64748B'),
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 16,
      paddingHorizontal: 8,
    },
    confirmDetailBox: {
      width: '100%',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      paddingVertical: 4,
      paddingHorizontal: 14,
      marginBottom: 14,
    },
    confirmDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 9,
    },
    confirmDetailLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
      flex: 1,
      marginRight: 8,
    },
    confirmDetailValue: {
      fontSize: 13,
      fontWeight: '700',
      color: Colors.text.primary || (isDark ? '#F1F5F9' : '#1E293B'),
      flexShrink: 1,
      textAlign: 'right',
    },
    confirmDetailDivider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
    },
    confirmPaymentBanner: {
      width: '100%',
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.28)' : '#BFDBFE',
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 16,
    },
    confirmPaymentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginBottom: 4,
    },
    confirmPaymentNotice: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#93C5FD' : '#1D4ED8',
      textAlign: 'center',
    },
    confirmPaymentPriceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
    },
    confirmPaymentPriceLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#E2E8F0' : '#1E293B',
    },
    confirmPaymentPriceValue: {
      fontSize: 18,
      fontWeight: '900',
      color: isDark ? '#60A5FA' : '#1D4ED8',
    },
    confirmActionsRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    confirmCancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
    },
    confirmCancelBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: Colors.text.primary || (isDark ? '#E2E8F0' : '#334155'),
    },
    confirmSubmitBtn: {
      flex: 1.3,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.primary || '#132361',
      shadowColor: Colors.primary || '#132361',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    confirmSubmitBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },

    // --- VISTA 3: PEDIDO REALIZADO (IMAGEN 4) ---
    orderStatusCard: {
      backgroundColor: Colors.card,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: cardBorderColor,
      padding: 18,
      alignItems: 'center',
      marginBottom: 14,
    },
    orderStatusTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: isDark ? Colors.text.primary : '#111827',
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    orderStatusSubtitle: {
      fontSize: 13,
      color: isDark ? Colors.text.secondary : '#64748B',
      marginTop: 4,
      textAlign: 'center',
      lineHeight: 18,
    },
    qrCodeCard: {
      backgroundColor: Colors.card,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: cardBorderColor,
      padding: 18,
      alignItems: 'center',
      marginBottom: 14,
    },
    qrCardTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: isDark ? Colors.text.primary : '#111827',
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    qrCardSubtitle: {
      fontSize: 12,
      color: isDark ? Colors.text.secondary : '#64748B',
      marginTop: 3,
      textAlign: 'center',
      marginBottom: 10,
    },
    qrWrapper: {
      marginVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orderSummaryCard: {
      backgroundColor: summaryCardBg,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: summaryCardBorder,
      padding: 16,
      marginBottom: 16,
    },
    orderSummaryTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: isDark ? '#f472b6' : '#111827',
      marginBottom: 12,
    },
    summaryList: {
      marginBottom: 4,
    },
    summaryLine: {
      fontSize: 13,
      color: isDark ? Colors.text.primary : '#1E293B',
      marginBottom: 6,
      lineHeight: 18,
    },
    summaryLineBold: {
      fontWeight: '700',
    },
    summaryDivider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(244, 114, 182, 0.25)' : '#E2E8F0',
      marginVertical: 10,
    },
    summaryTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryTotalLabel: {
      fontSize: 14,
      fontWeight: 'bold',
      color: isDark ? Colors.text.primary : '#111827',
    },
    summaryTotalValue: {
      fontSize: 17,
      fontWeight: '900',
      color: isDark ? '#60A5FA' : '#1D4ED8',
    },
    cancelOrderBtn: {
      marginTop: 4,
      marginBottom: 30,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
    },
    cancelOrderBtnText: {
      color: '#DC2626',
      fontWeight: 'bold',
      fontSize: 13,
    },

    // Empty state
    emptyCard: {
      backgroundColor: Colors.card,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: cardBorderColor,
      padding: 24,
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 20,
    },
    emptyText: {
      fontSize: 13,
      color: Colors.text.muted,
      marginTop: 8,
      textAlign: 'center',
    },
  });
};
