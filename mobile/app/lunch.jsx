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
  useWindowDimensions
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
  Check
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
      showAlert({
        type: 'success',
        title: t('lunch.orderPlacedTitle', '¡Pedido Exitoso!'),
        message: t('lunch.orderPlacedMsg', 'Tu pedido de almuerzo ha sido registrado. Presenta tu código QR en el cafetín para retirar y pagar.')
      });
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
        <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
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
                <Text style={styles.summaryLineBold}>{t('lunch.cafetinLabel', 'Cafetín')}: </Text>
                {existingOrder.cafetin?.full_name}
              </Text>
              <Text style={styles.summaryLine}>
                <Text style={styles.summaryLineBold}>{t('lunch.platillo', 'Platillo Fuerte')}: </Text>
                {existingOrder.fuerte?.name}
              </Text>
              <Text style={styles.summaryLine}>
                <Text style={styles.summaryLineBold}>{t('lunch.acomp1', 'Acompañamiento 1')}: </Text>
                {existingOrder.acompanamiento1?.name}
              </Text>
              <Text style={styles.summaryLine}>
                <Text style={styles.summaryLineBold}>{t('lunch.acomp2', 'Acompañamiento 2')}: </Text>
                {existingOrder.acompanamiento2?.name}
              </Text>
              <Text style={styles.summaryLine}>
                <Text style={styles.summaryLineBold}>{t('lunch.tortillas', 'Cantidad de Tortillas')}: </Text>
                {existingOrder.tortillas_qty}
              </Text>
              {existingOrder.refresco?.name ? (
                <Text style={styles.summaryLine}>
                  <Text style={styles.summaryLineBold}>{t('lunch.bebida', 'Refresco')} (+ $0.25): </Text>
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
              <View style={styles.bentoCard}>
                <Text style={styles.bentoCardTitle}>{t('lunch.tortillas', 'Cantidad de tortillas')}</Text>
                {[1, 2, 0].map(qty => {
                  const isSelected = tortillasQty === qty;
                  const label = qty === 1 
                    ? t('lunch.tortillaSingle', '1 tortilla') 
                    : t('lunch.tortillasPlural', '{{count}} tortillas', { count: qty });
                  return (
                    <TouchableOpacity
                      key={qty}
                      style={[styles.radioItemBox, isSelected && styles.radioItemBoxSelected]}
                      onPress={() => { hapticLight(); setTortillasQty(qty); }}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.radioItemText, isSelected && styles.radioItemTextSelected]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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

        {/* --- MODAL DE CONFIRMACIÓN (IMAGEN 3) --- */}
        {confirmModalVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalDialog}>
              <Text style={styles.modalTitle}>{t('lunch.confirmTitle', 'Confirmar pedido de almuerzo')}</Text>
              
              {/* Recuadro con bordes y la lista detallada */}
              <View style={styles.modalInnerBox}>
                <Text style={styles.modalLine}>
                  <Text style={styles.modalLineBold}>{t('lunch.cafetinLabel', 'Cafetín')}: </Text>
                  {selectedCafetin?.full_name}
                </Text>
                <Text style={styles.modalLine}>
                  <Text style={styles.modalLineBold}>{t('lunch.platillo', 'Platillo Fuerte')}: </Text>
                  {selectedFuerte?.name}
                </Text>
                <Text style={styles.modalLine}>
                  <Text style={styles.modalLineBold}>{t('lunch.acomp1', 'Acompañamiento 1')}: </Text>
                  {selectedAcomp1?.name}
                </Text>
                <Text style={styles.modalLine}>
                  <Text style={styles.modalLineBold}>{t('lunch.acomp2', 'Acompañamiento 2')}: </Text>
                  {selectedAcomp2?.name}
                </Text>
                <Text style={styles.modalLine}>
                  <Text style={styles.modalLineBold}>{t('lunch.tortillas', 'Cantidad de Tortillas')}: </Text>
                  {tortillasQty}
                </Text>
                {selectedRefresco && (
                  <Text style={styles.modalLine}>
                    <Text style={styles.modalLineBold}>{t('lunch.bebida', 'Refresco')}: </Text>
                    {selectedRefresco.name}
                  </Text>
                )}
              </View>

              {/* Banner azul: Se pagará en el momento del retiro */}
              <View style={styles.modalBlueBanner}>
                <Text style={styles.modalBlueBannerText}>
                  {t('lunch.paymentNoticePickup', 'Se pagará al ir a recoger (${{amount}})', { amount: calculatedTotal.toFixed(2) })}
                </Text>
              </View>

              {/* Botones de acción */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setConfirmModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelBtnText}>{t('common.cancel', 'Cancelar')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, submittingOrder && { opacity: 0.6 }]}
                  onPress={handleFinalizeOrder}
                  disabled={submittingOrder}
                  activeOpacity={0.8}
                >
                  {submittingOrder ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>{t('lunch.confirmBtn', 'Guardar')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
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
      paddingBottom: 40,
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

    // --- VISTA 2: MODAL DE CONFIRMACIÓN (IMAGEN 3) ---
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      zIndex: 9999,
      elevation: 9999,
    },
    modalDialog: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: isDark ? Colors.card : '#FFFFFF',
      borderRadius: 22,
      padding: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? Colors.text.primary : '#111827',
      marginBottom: 14,
      textAlign: 'left',
    },
    modalInnerBox: {
      borderWidth: 1.5,
      borderColor: cardBorderColor,
      borderRadius: 16,
      padding: 14,
      backgroundColor: isDark ? '#18181B' : '#FFFFFF',
      marginBottom: 14,
    },
    modalLine: {
      fontSize: 13,
      color: isDark ? Colors.text.primary : '#1E293B',
      marginBottom: 6,
      lineHeight: 18,
    },
    modalLineBold: {
      fontWeight: '700',
    },
    modalBlueBanner: {
      backgroundColor: '#3b82f6',
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    modalBlueBannerText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    modalActionsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: cardBorderColor,
      backgroundColor: isDark ? '#18181B' : '#FFFFFF',
    },
    modalCancelBtnText: {
      color: isDark ? '#FFFFFF' : '#1E293B',
      fontWeight: 'bold',
      fontSize: 13,
    },
    modalConfirmBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.primary || '#132361',
    },
    modalConfirmBtnText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 13,
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
