const { supabaseAdmin } = require('../config/supabase');

const getElSalvadorDate = (dateObj = new Date()) => {
    return new Date(dateObj).toLocaleDateString('sv-SE', { timeZone: 'America/El_Salvador' });
};

const cafetinController = {
    // 1. Obtener catálogo completo del cafetín
    getCatalog: async (req, res) => {
        try {
            const cafetinId = req.user.id;
            const { data, error } = await supabaseAdmin
                .from('cafetin_menu_items')
                .select('*')
                .eq('cafetin_id', cafetinId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json(data || []);
        } catch (error) {
            console.error('Error al obtener catálogo:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // 2. Agregar ítem al catálogo
    createCatalogItem: async (req, res) => {
        try {
            const cafetinId = req.user.id;
            const { name, category, description } = req.body;

            if (!name || !category) {
                return res.status(400).json({ error: 'El nombre y la categoría son obligatorios' });
            }

            const validCategories = ['fuerte', 'acompanamiento', 'refresco'];
            if (!validCategories.includes(category)) {
                return res.status(400).json({ error: 'Categoría inválida. Debe ser fuerte, acompanamiento o refresco' });
            }

            const { data, error } = await supabaseAdmin
                .from('cafetin_menu_items')
                .insert([{
                    cafetin_id: cafetinId,
                    name: name.trim(),
                    category,
                    description: description ? description.trim() : null
                }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(data);
        } catch (error) {
            console.error('Error al agregar al catálogo:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // 3. Eliminar (desactivar) ítem del catálogo
    deleteCatalogItem: async (req, res) => {
        try {
            const cafetinId = req.user.id;
            const { id } = req.params;

            const { error } = await supabaseAdmin
                .from('cafetin_menu_items')
                .update({ is_active: false })
                .eq('id', id)
                .eq('cafetin_id', cafetinId);

            if (error) throw error;
            res.json({ message: 'Alimento eliminado del catálogo exitosamente' });
        } catch (error) {
            console.error('Error al eliminar ítem:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // 4. Obtener menú publicado del día actual para este cafetín
    getTodayPublishedMenu: async (req, res) => {
        try {
            const cafetinId = req.user.id;
            const today = getElSalvadorDate();

            const { data, error } = await supabaseAdmin
                .from('cafetin_daily_menu')
                .select(`
                    id,
                    menu_item_id,
                    cafetin_menu_items (*)
                `)
                .eq('cafetin_id', cafetinId)
                .eq('date', today);

            if (error) throw error;
            
            const items = (data || []).map(d => d.cafetin_menu_items).filter(Boolean);
            res.json(items);
        } catch (error) {
            console.error('Error al obtener menú del día:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // 5. Publicar el menú del día
    publishDailyMenu: async (req, res) => {
        try {
            const cafetinId = req.user.id;
            const { item_ids } = req.body; // Array de UUIDs de cafetin_menu_items
            const today = getElSalvadorDate();

            if (!Array.isArray(item_ids)) {
                return res.status(400).json({ error: 'Se requiere una lista de IDs de alimentos' });
            }

            // Eliminar publicaciones anteriores de hoy para este cafetín
            await supabaseAdmin
                .from('cafetin_daily_menu')
                .delete()
                .eq('cafetin_id', cafetinId)
                .eq('date', today);

            if (item_ids.length > 0) {
                const recordsToInsert = item_ids.map(itemId => ({
                    cafetin_id: cafetinId,
                    menu_item_id: itemId,
                    date: today
                }));

                const { error: insertError } = await supabaseAdmin
                    .from('cafetin_daily_menu')
                    .insert(recordsToInsert);

                if (insertError) throw insertError;
            }

            res.json({ message: 'Menú del día publicado exitosamente', publishedCount: item_ids.length });
        } catch (error) {
            console.error('Error al publicar menú del día:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // 6. Obtener pedidos recibidos hoy para este cafetín
    getTodayOrders: async (req, res) => {
        try {
            const cafetinId = req.user.id;
            const today = getElSalvadorDate();

            // Limpieza de pedidos de días anteriores
            await supabaseAdmin
                .from('lunch_orders')
                .delete()
                .lt('date', today);

            const { data, error } = await supabaseAdmin
                .from('lunch_orders')
                .select(`
                    *,
                    user:profiles!user_id(full_name, email, role, institutional_code),
                    fuerte:cafetin_menu_items!fuerte_item_id(name),
                    acompanamiento1:cafetin_menu_items!acompanamiento1_item_id(name),
                    acompanamiento2:cafetin_menu_items!acompanamiento2_item_id(name),
                    refresco:cafetin_menu_items!refresco_item_id(name)
                `)
                .eq('cafetin_id', cafetinId)
                .eq('date', today)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json(data || []);
        } catch (error) {
            console.error('Error al obtener pedidos del día:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // 7. Actualizar estado de pedido (Doble clic -> 'preparado')
    updateOrderStatus: async (req, res) => {
        try {
            const cafetinId = req.user.id;
            const { id } = req.params;
            const { status } = req.body;

            const validStatuses = ['ordenado', 'preparado', 'entregado'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Estado inválido' });
            }

            const { data, error } = await supabaseAdmin
                .from('lunch_orders')
                .update({ 
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('cafetin_id', cafetinId)
                .select(`
                    *,
                    user:profiles!user_id(full_name)
                `)
                .single();

            if (error) throw error;
            res.json(data);
        } catch (error) {
            console.error('Error al actualizar estado del pedido:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // 8. Escanear / Verificar pedido por QR
    verifyOrderQR: async (req, res) => {
        try {
            const cafetinId = req.user.id;
            const { orderId } = req.params;

            const { data, error } = await supabaseAdmin
                .from('lunch_orders')
                .select(`
                    *,
                    user:profiles!user_id(full_name, email, role, institutional_code),
                    fuerte:cafetin_menu_items!fuerte_item_id(name),
                    acompanamiento1:cafetin_menu_items!acompanamiento1_item_id(name),
                    acompanamiento2:cafetin_menu_items!acompanamiento2_item_id(name),
                    refresco:cafetin_menu_items!refresco_item_id(name)
                `)
                .eq('id', orderId)
                .eq('cafetin_id', cafetinId)
                .single();

            if (error || !data) {
                return res.status(404).json({ error: 'Pedido no encontrado o no pertenece a este cafetín' });
            }

            res.json(data);
        } catch (error) {
            console.error('Error al verificar QR de pedido:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // 9. Confirmar despacho del pedido (Estado -> 'entregado')
    confirmDispatch: async (req, res) => {
        try {
            const cafetinId = req.user.id;
            const { orderId } = req.params;

            const { data, error } = await supabaseAdmin
                .from('lunch_orders')
                .update({ 
                    status: 'entregado',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId)
                .eq('cafetin_id', cafetinId)
                .select(`
                    *,
                    user:profiles!user_id(full_name)
                `)
                .single();

            if (error) throw error;
            res.json({ message: 'Pedido entregado exitosamente', order: data });
        } catch (error) {
            console.error('Error al confirmar despacho:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // 10. Eliminar / Cancelar pedido desde el cafetín (habilita volver a pedir al usuario)
    deleteOrder: async (req, res) => {
        try {
            const cafetinId = req.user.id;
            const { id } = req.params;

            const { error } = await supabaseAdmin
                .from('lunch_orders')
                .delete()
                .eq('id', id)
                .eq('cafetin_id', cafetinId);

            if (error) throw error;
            res.json({ message: 'Pedido eliminado exitosamente' });
        } catch (error) {
            console.error('Error al eliminar pedido:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = cafetinController;
