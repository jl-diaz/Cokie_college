import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Utensils, 
  ShoppingBag, 
  QrCode, 
  Sparkles, 
  UtensilsCrossed, 
  Bell, 
  Clock 
} from 'lucide-react-native';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { 
  BentoStatCard, 
  WideBannerCard, 
  ActionCard, 
  RecentMessagesWidget 
} from './DashboardShared';

export default function CafetinDashboard({ isDark = false }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [todayMenu, setTodayMenu] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    fetchCafetinData();
  }, []);

  const fetchCafetinData = async () => {
    try {
      setLoading(true);
      const [ordersRes, menuRes, catalogRes, chatRes] = await Promise.allSettled([
        api.get('/cafetin/orders?limit=50'),
        api.get('/cafetin/daily-menu'),
        api.get('/cafetin/catalog'),
        api.get('/chat/conversations')
      ]);

      if (ordersRes.status === 'fulfilled' && ordersRes.value.data) {
        const d = ordersRes.value.data;
        setOrders(d.data || (Array.isArray(d) ? d : []));
      }
      if (menuRes.status === 'fulfilled' && Array.isArray(menuRes.value.data)) {
        setTodayMenu(menuRes.value.data);
      }
      if (catalogRes.status === 'fulfilled' && Array.isArray(catalogRes.value.data)) {
        setCatalog(catalogRes.value.data);
      }
      if (chatRes.status === 'fulfilled' && Array.isArray(chatRes.value.data)) {
        setConversations(chatRes.value.data);
      }
    } catch (err) {
      console.warn('Error loading cafetin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingOrdersCount = useMemo(() => {
    return orders.filter(o => o.status !== 'despachado').length;
  }, [orders]);

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="small" color="#EC4899" />
        <Text style={[styles.loadingText, isDark && styles.textMuted]}>
          {t('dashboard.loadingCafetin', 'Cargando panel de cafetín...')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Banner Superior del Cafetín */}
      <WideBannerCard 
        tag={t('dashboard.schoolCafetin', 'Cafetín Escolar')}
        title={todayMenu.length > 0 ? t('dashboard.menuDishesToday', { count: todayMenu.length, defaultValue: `${todayMenu.length} Platos en Menú Hoy` }) : t('dashboard.lunchMenu', 'Menú de Almuerzo')}
        subtitle={todayMenu.length > 0 
          ? t('dashboard.menuActiveToday', 'Menú del día activo para encargo de estudiantes y docentes') 
          : t('dashboard.menuNotPublishedToday', 'Aún no has publicado el menú del día para hoy')}
        actionLabel={t('dashboard.configureMenu', 'Configurar menú')}
        variant="blue"
        isDark={isDark}
        fallbackIcon={UtensilsCrossed}
        onPress={() => router.push('/cafetin')}
      />

      {/* 2. Estadísticas Principales: Pedidos (Azul Marino) y Catálogo (Rosa Cokie / Lavanda) */}
      <View style={styles.statsRow}>
        <BentoStatCard 
          tag={t('dashboard.ordersToday', 'Pedidos Hoy')}
          value={`${orders.length}`}
          subtitle={pendingOrdersCount > 0 ? t('dashboard.ordersPendingDispatch', { count: pendingOrdersCount, defaultValue: `${pendingOrdersCount} por despachar` }) : t('dashboard.allDelivered', 'Todos entregados')}
          variant="yellow"
          isDark={isDark}
          fallbackIcon={ShoppingBag}
          onPress={() => router.push('/cafetin')}
        />

        <BentoStatCard 
          tag={t('dashboard.catalog', 'Catálogo')}
          value={`${catalog.length}`}
          subtitle={t('dashboard.dishesRegistered', 'Platillos registrados')}
          variant="lavender"
          isDark={isDark}
          fallbackIcon={Utensils}
          onPress={() => router.push('/cafetin')}
        />
      </View>

      {/* 3. Mensajes Recientes de CokieChat */}
      <RecentMessagesWidget 
        conversations={conversations} 
        isDark={isDark} 
        onPressChat={() => router.push('/chat')} 
      />

      {/* 4. Herramientas del Cafetín */}
      <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>
        {t('dashboard.cafetinOperations', 'Operaciones del cafetín')}
      </Text>
      
      <ActionCard 
        title={t('dashboard.scanQrPickup', 'Escanear QR de Retiro')}
        subtitle={t('dashboard.scanQrPickupSub', 'Verificar y confirmar entrega de almuerzo escaneando código')}
        isDark={isDark}
        fallbackIcon={QrCode}
        iconColor="#FFFFFF"
        slotBgColor={isDark ? '#27272A' : '#18181B'}
        onPress={() => router.push('/cafetin')}
      />

      <ActionCard 
        title={t('dashboard.publishDailyMenu', 'Publicar Menú Diario')}
        subtitle={t('dashboard.publishDailyMenuSub', 'Seleccionar platos fuertes, acompañamientos y refresco del día')}
        isDark={isDark}
        fallbackIcon={Sparkles}
        iconColor="#FFFFFF"
        slotBgColor={isDark ? '#27272A' : '#18181B'}
        onPress={() => router.push('/cafetin')}
      />

      {/* 5. Fila Flex: Pedidos y Avisos */}
      <View style={styles.actionRowFlex}>
        <View style={{ flex: 1 }}>
          <ActionCard 
            title={t('dashboard.orders', 'Pedidos')}
            isDark={isDark}
            fallbackIcon={ShoppingBag}
            iconColor="#FFFFFF"
            slotBgColor={isDark ? '#27272A' : '#18181B'}
            borderColor="black"
            onPress={() => router.push('/cafetin')}
          />
        </View>

        <View style={{ flex: 1 }}>
          <ActionCard 
            title={t('menu.announcements', 'Avisos')}
            isDark={isDark}
            fallbackIcon={Bell}
            iconColor="#FFFFFF"
            slotBgColor={isDark ? '#27272A' : '#18181B'}
            borderColor="black"
            onPress={() => router.push('/announcements')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  centerLoading: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
  },
  textMuted: {
    color: '#94A3B8',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionRowFlex: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 12,
    marginLeft: 2,
  },
});
