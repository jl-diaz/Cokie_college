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
  Platform
} from 'react-native';
import { 
  Store, 
  Clock, 
  CheckCircle, 
  Sparkles, 
  ChevronRight,
  Info,
  Trash2,
  X
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/utils/api';
import QRCodeDisplay from '../src/components/QRCodeDisplay';
import { useAlert } from '../src/context/AlertContext';
import PageHeader from '../src/components/PageHeader';
import BottomModal from '../src/components/BottomModal';

export default function LunchScreen() {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const { profile } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estado si el usuario ya realizó su pedido del día
  const [existingOrder, setExistingOrder] = useState(null);

  // Estados para el flujo de selección de pedido
  const [cafetines, setCafetines] = useState([]);
  const [selectedCafetin, setSelectedCafetin] = useState(null);
  const [dailyMenu, setDailyMenu] = useState({ fuertes: [], acompanamientos: [], refrescos: [] });
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Selecciones obligatorias y opcionales
  const [selectedFuerte, setSelectedFuerte] = useState(null);
  const [selectedAcomp1, setSelectedAcomp1] = useState(null);
  const [selectedAcomp2, setSelectedAcomp2] = useState(null);
  const [tortillasQty, setTortillasQty] = useState(1); // Default 1 (0, 1, 2)
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
      let cafList = [];
      try {
        const cafRes = await api.get('/lunch/cafetines');
        cafList = cafRes.data || [];
        setCafetines(cafList);
      } catch (cafErr) {
        console.error('Error al cargar cafetines:', cafErr);
      }

      // 2. Verificar si ya tiene pedido hoy
      let hasOrder = false;
      try {
        const orderRes = await api.get('/lunch/my-today-order');
        if (orderRes.data) {
          setExistingOrder(orderRes.data);
          hasOrder = true;
        } else {
          setExistingOrder(null);
        }
      } catch (ordErr) {
        if (ordErr.response?.status !== 404) {
          console.error('Error al consultar pedido del día:', ordErr);
        }
        setExistingOrder(null);
      }

      // 3. Si no tiene pedido y hay cafetines, auto-seleccionar el primero si no hay selección
      if (!hasOrder && cafList.length > 0) {
        handleSelectCafetin(cafList[0]);
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
    setSelectedCafetin(cafetin);
    setSelectedFuerte(null);
    setSelectedAcomp1(null);
    setSelectedAcomp2(null);
    setSelectedRefresco(null);
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
      showAlert({
        type: 'success',
        title: t('lunch.orderPlacedTitle', '¡Pedido Exitoso!'),
        message: t('lunch.orderPlacedMsg', 'Tu pedido de almuerzo ha sido registrado. Presenta tu código QR en el cafetín para retirar y pagar.')
      });
    } catch (error) {
      console.error('Error al realizar el pedido:', error);
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
          showAlert({
            type: 'success',
            title: 'Pedido Cancelado',
            message: 'Tu pedido ha sido cancelado. Ahora puedes realizar un nuevo encargo.'
          });
          await checkTodayOrderAndFetchCafetines();
        } catch (error) {
          console.error('Error al cancelar pedido:', error);
          showAlert({
            type: 'error',
            title: 'Error',
            message: error.response?.data?.error || 'No se pudo cancelar el pedido.'
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('lunch.loadingModule', 'Cargando módulo de almuerzos...')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex1}>
      <PageHeader 
        title={t('titles.lunch', 'Encargo de Almuerzos')}
        subtitle={t('titles.lunchSubtitle', 'Pre-pedido y código QR de retiro')}
      />

      {existingOrder ? (
        // --- VISTA 1: USUARIO YA TIENE PEDIDO HOY (MOSTRAR QR Y ESTADO) ---
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); checkTodayOrderAndFetchCafetines(); }} />
          }
        >
          <View style={styles.orderActiveHeader}>
            {existingOrder.status === 'entregado' ? (
              <CheckCircle size={32} color="#64748b" />
            ) : existingOrder.status === 'preparado' ? (
              <Sparkles size={32} color="#10b981" />
            ) : (
              <Clock size={32} color="#f59e0b" />
            )}

            <Text style={styles.orderActiveStatusTitle}>
              {existingOrder.status === 'entregado' 
                ? t('lunch.orderDelivered', 'Almuerzo Entregado') 
                : existingOrder.status === 'preparado' 
                ? t('lunch.orderPrepared', '¡Tu almuerzo está PREPARADO!') 
                : t('lunch.orderReceived', 'Pedido Recibido')}
            </Text>
            <Text style={styles.orderActiveStatusSub}>
              {existingOrder.status === 'entregado' 
                ? t('lunch.deliveredDesc', 'Has retirado con éxito tu almuerzo de hoy.') 
                : existingOrder.status === 'preparado' 
                ? t('lunch.preparedDesc', 'Pasa al cafetín con tu código QR para pagar y recoger.') 
                : t('lunch.receivedDesc', 'En espera de que el cafetín prepare tu plato.')}
            </Text>
          </View>

          {/* CÓDIGO QR PARA RETIRO */}
          <View style={styles.qrContainer}>
            <Text style={styles.qrHeaderTitle}>{t('lunch.qrCodeTitle', 'Código QR de Retiro')}</Text>
            <Text style={styles.qrHeaderSub}>{t('lunch.qrCodeSub', 'Muestra este código al personal del cafetín')}</Text>
            
            <View style={{ marginVertical: 16 }}>
              <QRCodeDisplay value={existingOrder.id} size={190} color={Colors.primary} />
            </View>

            <View style={styles.noticePickup}>
              <Info size={16} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.noticePickupText}>
                {t('lunch.paymentNoticePickup', 'Se pagará al ir a recoger (${{amount}})', { amount: Number(existingOrder.total_price).toFixed(2) })}
              </Text>
            </View>
          </View>

          {/* DETALLE DEL PEDIDO */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>{t('lunch.orderSummary', 'Resumen del Almuerzo')}</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('lunch.cafetinLabel', 'Cafetín:')}</Text>
              <Text style={styles.detailVal}>{existingOrder.cafetin?.full_name}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('lunch.platillo', 'Platillo Fuerte:')}</Text>
              <Text style={styles.detailVal}>{existingOrder.fuerte?.name}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('lunch.acomp1', 'Acompañamiento 1:')}</Text>
              <Text style={styles.detailVal}>{existingOrder.acompanamiento1?.name}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('lunch.acomp2', 'Acompañamiento 2:')}</Text>
              <Text style={styles.detailVal}>{existingOrder.acompanamiento2?.name}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('lunch.tortillas', 'Tortillas:')}</Text>
              <Text style={styles.detailVal}>{existingOrder.tortillas_qty}</Text>
            </View>

            {existingOrder.refresco?.name ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('lunch.bebida', 'Refresco (+ $0.25):')}</Text>
                <Text style={styles.detailVal}>{existingOrder.refresco?.name}</Text>
              </View>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalTxtLabel}>{t('lunch.totalToPay', 'Total a Pagar')}:</Text>
              <Text style={styles.totalTxtValue}>${Number(existingOrder.total_price).toFixed(2)}</Text>
            </View>
          </View>

          <Text style={styles.footerLimitNote}>{t('lunch.dailyLimitReached', 'Límite alcanzado: 1 pedido por día por usuario.')}</Text>

          {existingOrder.status !== 'entregado' && (
            <TouchableOpacity 
              style={{
                marginTop: 12,
                marginBottom: 30,
                backgroundColor: '#fee2e2',
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#fca5a5'
              }}
              onPress={handleCancelOrder}
            >
              <Trash2 size={16} color="#dc2626" style={{ marginRight: 6 }} />
              <Text style={{ color: '#dc2626', fontWeight: 'bold', fontSize: 13 }}>
                {t('lunch.cancelTodayOrder', 'Cancelar mi pedido del día')}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        // --- VISTA 2: FORMULARIO DE ENCARGO DE ALMUERZO ---
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* PASO 1: SELECCIONAR CAFETÍN */}
          <Text style={styles.stepTitle}>{t('lunch.selectCafetin', '1. Selecciona un Cafetín')}</Text>

          {cafetines.length === 0 ? (
            <View style={styles.emptyCafetinesCard}>
              <Store size={36} color={Colors.text.muted} />
              <Text style={styles.emptyCafetinesText}>No hay cafetines disponibles en este momento.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cafetinScroll}>
              {cafetines.map(cafetin => {
                const isSelected = selectedCafetin?.id === cafetin.id;
                return (
                  <TouchableOpacity
                    key={cafetin.id}
                    style={[styles.cafetinCard, isSelected && styles.cafetinCardSelected]}
                    onPress={() => handleSelectCafetin(cafetin)}
                    activeOpacity={0.8}
                  >
                    <Store size={24} color={isSelected ? Colors.primary : Colors.text.secondary} />
                    <Text style={[styles.cafetinName, isSelected && styles.cafetinNameSelected]} numberOfLines={1}>
                      {cafetin.full_name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* PASO 2: ELEGIR COMIDA DE HOY */}
          {selectedCafetin && (
            <View style={styles.menuSection}>
              <Text style={styles.stepTitle}>{t('lunch.step2BuildLunch', '2. Arma tu Almuerzo')}</Text>

              {loadingMenu ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
              ) : dailyMenu.fuertes.length === 0 ? (
                <View style={styles.emptyCafetinesCard}>
                  <Info size={36} color={Colors.primary} style={{ marginBottom: 8 }} />
                  <Text style={[styles.emptyCafetinesText, { textAlign: 'center', fontSize: 14, fontWeight: '700', color: Colors.text.primary }]}>
                    {t('lunch.menuNotPublishedTitle', 'Menú no publicado')}
                  </Text>
                  <Text style={[styles.emptyCafetinesText, { textAlign: 'center', marginTop: 6, lineHeight: 18 }]}>
                    {t('lunch.menuNotPublishedDesc', 'El cafetín ({{cafetin}}) aún no ha publicado las opciones del menú para hoy. Los encargos estarán disponibles cuando el cafetín publique.', { cafetin: selectedCafetin.full_name })}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.stepSub}>{t('lunch.comboSub', 'Combo Base por $2.50 (Fuerte + 2 Acompañamientos + Tortillas)')}</Text>

                  {/* PLATILLO FUERTE (OBLIGATORIO) */}
                  <View style={styles.selectBlock}>
                    <Text style={styles.blockTitle}>• {t('lunch.chooseFuerte', 'Platillo Fuerte')} <Text style={styles.requiredMark}>*</Text></Text>
                    {dailyMenu.fuertes.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.choiceOption, selectedFuerte?.id === item.id && styles.choiceOptionSelected]}
                        onPress={() => setSelectedFuerte(item)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.radioCircle, selectedFuerte?.id === item.id && styles.radioCircleSelected]} />
                        <Text style={[styles.choiceText, selectedFuerte?.id === item.id && styles.choiceTextSelected]}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* ACOMPAÑAMIENTO 1 (OBLIGATORIO) */}
                  <View style={styles.selectBlock}>
                    <Text style={styles.blockTitle}>• {t('lunch.chooseAcomp1', 'Acompañamiento 1')} <Text style={styles.requiredMark}>*</Text></Text>
                    {dailyMenu.acompanamientos.length === 0 ? (
                      <Text style={styles.noItemsText}>{t('lunch.noAcompsToday', 'No hay acompañamientos disponibles hoy.')}</Text>
                    ) : (
                      dailyMenu.acompanamientos.map(item => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.choiceOption, selectedAcomp1?.id === item.id && styles.choiceOptionSelected]}
                          onPress={() => setSelectedAcomp1(item)}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.radioCircle, selectedAcomp1?.id === item.id && styles.radioCircleSelected]} />
                          <Text style={[styles.choiceText, selectedAcomp1?.id === item.id && styles.choiceTextSelected]}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>

                  {/* ACOMPAÑAMIENTO 2 (OBLIGATORIO) */}
                  <View style={styles.selectBlock}>
                    <Text style={styles.blockTitle}>• {t('lunch.chooseAcomp2', 'Acompañamiento 2')} <Text style={styles.requiredMark}>*</Text></Text>
                    {dailyMenu.acompanamientos.length === 0 ? (
                      <Text style={styles.noItemsText}>{t('lunch.noAcompsToday', 'No hay acompañamientos disponibles hoy.')}</Text>
                    ) : (
                      dailyMenu.acompanamientos.map(item => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.choiceOption, selectedAcomp2?.id === item.id && styles.choiceOptionSelected]}
                          onPress={() => setSelectedAcomp2(item)}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.radioCircle, selectedAcomp2?.id === item.id && styles.radioCircleSelected]} />
                          <Text style={[styles.choiceText, selectedAcomp2?.id === item.id && styles.choiceTextSelected]}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>

                  {/* CANTIDAD TORTILLAS (OBLIGATORIO: 0, 1, 2) */}
                  <View style={styles.selectBlock}>
                    <Text style={styles.blockTitle}>• {t('lunch.tortillas', 'Cantidad de Tortillas')} <Text style={styles.requiredMark}>*</Text></Text>
                    <View style={styles.tortillasRow}>
                      {[0, 1, 2].map(qty => (
                        <TouchableOpacity
                          key={qty}
                          style={[styles.tortillaChip, tortillasQty === qty && styles.tortillaChipSelected]}
                          onPress={() => setTortillasQty(qty)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.tortillaChipText, tortillasQty === qty && styles.tortillaChipTextSelected]}>
                            {qty} {qty === 1 ? t('lunch.tortillaSingle', 'Tortilla') : t('lunch.tortillasPlural', 'Tortillas')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* REFRESCO (OPCIONAL + $0.25) */}
                  <View style={styles.selectBlock}>
                    <Text style={styles.blockTitle}>• {t('lunch.chooseRefresco', 'Refresco / Bebida (Opcional +$0.25)')}</Text>
                    <TouchableOpacity
                      style={[styles.choiceOption, selectedRefresco === null && styles.choiceOptionSelected]}
                      onPress={() => setSelectedRefresco(null)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.radioCircle, selectedRefresco === null && styles.radioCircleSelected]} />
                      <Text style={[styles.choiceText, selectedRefresco === null && styles.choiceTextSelected]}>
                        {t('lunch.noDrink', 'Sin refresco')}
                      </Text>
                    </TouchableOpacity>

                    {dailyMenu.refrescos.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.choiceOption, selectedRefresco?.id === item.id && styles.choiceOptionSelected]}
                        onPress={() => setSelectedRefresco(item)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.radioCircle, selectedRefresco?.id === item.id && styles.radioCircleSelected]} />
                        <Text style={[styles.choiceText, selectedRefresco?.id === item.id && styles.choiceTextSelected]}>
                          {item.name} (+ $0.25)
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* MONTO RESUMEN & BOTÓN CONTINUAR */}
                  <View style={styles.pricingBar}>
                    <View>
                      <Text style={styles.pricingLabel}>{t('lunch.finalAmount', 'Monto Final')}:</Text>
                      <Text style={styles.pricingValue}>${calculatedTotal.toFixed(2)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.orderActionBtn}
                      onPress={handleOpenConfirmModal}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.orderActionBtnText}>{t('lunch.finalizeOrder', 'Finalizar Pedido')}</Text>
                      <ChevronRight size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

          {/* MODAL DE CONFIRMACIÓN */}
          <BottomModal visible={confirmModalVisible} onClose={() => setConfirmModalVisible(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('lunch.confirmTitle', 'Confirmar Pedido de Almuerzo')}</Text>
                <TouchableOpacity onPress={() => setConfirmModalVisible(false)} style={{ padding: 4 }}>
                  <X size={22} color={Colors.primary} />
                </TouchableOpacity>
              </View>
                
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmItem}>• <Text style={{ fontWeight: '700' }}>{t('lunch.cafetinLabel', 'Cafetín:')}</Text> {selectedCafetin?.full_name}</Text>
                  <Text style={styles.confirmItem}>• <Text style={{ fontWeight: '700' }}>{t('lunch.platillo', 'Platillo Fuerte:')}</Text> {selectedFuerte?.name}</Text>
                  <Text style={styles.confirmItem}>• <Text style={{ fontWeight: '700' }}>{t('lunch.acomp1', 'Acompañamiento 1:')}</Text> {selectedAcomp1?.name}</Text>
                  <Text style={styles.confirmItem}>• <Text style={{ fontWeight: '700' }}>{t('lunch.acomp2', 'Acompañamiento 2:')}</Text> {selectedAcomp2?.name}</Text>
                  <Text style={styles.confirmItem}>• <Text style={{ fontWeight: '700' }}>{t('lunch.tortillas', 'Tortillas:')}</Text> {tortillasQty}</Text>
                  {selectedRefresco ? (
                    <Text style={styles.confirmItem}>• <Text style={{ fontWeight: '700' }}>{t('lunch.bebida', 'Refresco:')}</Text> {selectedRefresco.name}</Text>
                  ) : null}
                </View>

                <View style={styles.paymentNotice}>
                  <Info size={18} color="#d97706" style={{ marginRight: 8 }} />
                  <Text style={styles.paymentNoticeText}>
                    {t('lunch.paymentAtPickup', 'Se pagará al ir a recoger en el cafetín. Total: ')}<Text style={{ fontWeight: '900' }}>${calculatedTotal.toFixed(2)}</Text>
                  </Text>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>{t('dashboard.cancel', 'Volver')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmBtn, submittingOrder && { opacity: 0.6 }]}
                    onPress={handleFinalizeOrder}
                    disabled={submittingOrder}
                  >
                    {submittingOrder ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.confirmBtnText}>{t('dashboard.save', 'Confirmar')}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </BottomModal>
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  flex1: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  orderActiveHeader: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
  },
  orderActiveStatusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 10,
    textAlign: 'center',
  },
  orderActiveStatusSub: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  qrContainer: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
  },
  qrHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  qrHeaderSub: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
  },
  noticePickup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  noticePickupText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  detailsCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray[200] || '#e2e8f0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalTxtLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  totalTxtValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#16a34a',
  },
  footerLimitNote: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.text.muted,
    marginBottom: 30,
  },

  // Steps Form Styles
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 8,
    marginBottom: 12,
  },
  stepSub: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: -8,
    marginBottom: 16,
  },
  emptyCafetinesCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyCafetinesText: {
    fontSize: 13,
    color: Colors.text.muted,
    marginTop: 8,
  },
  cafetinScroll: {
    marginBottom: 20,
  },
  cafetinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
  },
  cafetinCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
  },
  cafetinName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 10,
  },
  cafetinNameSelected: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  menuSection: {
    marginTop: 8,
    paddingBottom: 40,
  },
  selectBlock: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
  },
  requiredMark: {
    color: '#ef4444',
  },
  noItemsText: {
    fontSize: 12,
    color: Colors.text.muted,
    fontStyle: 'italic',
  },
  choiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: Colors.background,
  },
  choiceOptionSelected: {
    backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#f0f9ff',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.text.muted,
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  choiceText: {
    fontSize: 13,
    color: Colors.text.primary,
  },
  choiceTextSelected: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  tortillasRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tortillaChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
    backgroundColor: Colors.background,
  },
  tortillaChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  tortillaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  tortillaChipTextSelected: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  pricingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
  },
  pricingLabel: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  pricingValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#16a34a',
  },
  orderActionBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 14,
  },
  orderActionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    padding: 0,
    margin: 0,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 24,
    paddingBottom: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  confirmBox: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  confirmItem: {
    fontSize: 13,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  paymentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  paymentNoticeText: {
    fontSize: 12,
    color: '#78350f',
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray[300] || '#cbd5e1',
  },
  cancelBtnText: {
    color: Colors.text.secondary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  }
});

