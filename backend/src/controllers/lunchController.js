const { supabaseAdmin } = require('../config/supabase');

const getElSalvadorDate = (dateObj = new Date()) => {
    return new Date(dateObj).toLocaleDateString('sv-SE', { timeZone: 'America/El_Salvador' });
};

const cleanupOldOrders = async () => {
    try {
        const today = getElSalvadorDate();
        await supabaseAdmin
            .from('lunch_orders')
            .delete()
            .lt('date', today);
    } catch (e) {
        console.error('Error al limpiar pedidos antiguos de almuerzo:', e);
    }
};

const lunchController = {
    // 1. Listar todos los cafetines disponibles
    getCafetines: async (req, res) => {
        try {
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, email')
                .eq('role', 'cafetin')
                .order('full_name', { ascending: true });

            if (error) {
                console.error('Error al listar cafetines (verificar enum user_role en DB):', error);
                return res.json([]);
            }
            res.json(data || []);
        } catch (error) {
            console.error('Error al listar cafetines:', error);
            res.json([]);
        }
    },

    // 2. Obtener el menú publicado por un cafetín específico para hoy
    getCafetinDailyMenu: async (req, res) => {
        try {
            const { cafetinId } = req.params;
            const today = getElSalvadorDate();

            const { data, error } = await supabaseAdmin
                .from('cafetin_daily_menu')
                .select(`
                    id,
                    cafetin_menu_items (*)
                `)
                .eq('cafetin_id', cafetinId)
                .eq('date', today);

            if (error) throw error;

            const items = (data || []).map(d => d.cafetin_menu_items).filter(item => item && item.is_active);

            // Agrupar por categoría
            const menu = {
                fuertes: items.filter(i => i.category === 'fuerte'),
                acompanamientos: items.filter(i => i.category === 'acompanamiento'),
                refrescos: items.filter(i => i.category === 'refresco')
            };

            res.json(menu);
        } catch (error) {
            console.error('Error al obtener menú diario del cafetín:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // 3. Verificar si el usuario actual ya realizó un pedido hoy
    getUserTodayOrder: async (req, res) => {
        try {
            await cleanupOldOrders();
            const userId = req.user.id;
            const today = getElSalvadorDate();

            const { data, error } = await supabaseAdmin
                .from('lunch_orders')
                .select(`
                    *,
                    cafetin:profiles!cafetin_id(full_name),
                    fuerte:cafetin_menu_items!fuerte_item_id(name),
                    acompanamiento1:cafetin_menu_items!acompanamiento1_item_id(name),
                    acompanamiento2:cafetin_menu_items!acompanamiento2_item_id(name),
                    refresco:cafetin_menu_items!refresco_item_id(name)
                `)
                .eq('user_id', userId)
                .eq('date', today)
                .maybeSingle();

            if (error) throw error;
            res.json(data || null);
        } catch (error) {
            console.error('Error al obtener pedido del usuario:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // 4. Crear un pedido de almuerzo
    createOrder: async (req, res) => {
        try {
            const userId = req.user.id;
            const today = getElSalvadorDate();

            const { 
                cafetin_id, 
                fuerte_item_id, 
                acompanamiento1_item_id, 
                acompanamiento2_item_id, 
                tortillas_qty, 
                refresco_item_id 
            } = req.body;

            // Validación de campos obligatorios
            if (!cafetin_id || !fuerte_item_id || !acompanamiento1_item_id || !acompanamiento2_item_id) {
                return res.status(400).json({ error: 'Debes seleccionar Fuerte, Acompañamiento 1 y Acompañamiento 2' });
            }

            if (tortillas_qty === undefined || tortillas_qty === null || ![0, 1, 2].includes(Number(tortillas_qty))) {
                return res.status(400).json({ error: 'La cantidad de tortillas debe ser 0, 1 o 2' });
            }

            // Verificar si el usuario ya realizó un pedido hoy
            const { data: existingOrder } = await supabaseAdmin
                .from('lunch_orders')
                .select('id')
                .eq('user_id', userId)
                .eq('date', today)
                .maybeSingle();

            if (existingOrder) {
                return res.status(400).json({ error: 'Ya has realizado tu pedido de almuerzo para el día de hoy. Límite: 1 pedido diario.' });
            }

            // Cálculo del precio total ($2.50 base, +$0.25 si incluye refresco)
            const totalPrice = refresco_item_id ? 2.75 : 2.50;

            const { data: newOrder, error: createError } = await supabaseAdmin
                .from('lunch_orders')
                .insert([{
                    user_id: userId,
                    cafetin_id,
                    date: today,
                    fuerte_item_id,
                    acompanamiento1_item_id,
                    acompanamiento2_item_id,
                    tortillas_qty: Number(tortillas_qty),
                    refresco_item_id: refresco_item_id || null,
                    total_price: totalPrice,
                    status: 'ordenado'
                }])
                .select(`
                    *,
                    cafetin:profiles!cafetin_id(full_name),
                    fuerte:cafetin_menu_items!fuerte_item_id(name),
                    acompanamiento1:cafetin_menu_items!acompanamiento1_item_id(name),
                    acompanamiento2:cafetin_menu_items!acompanamiento2_item_id(name),
                    refresco:cafetin_menu_items!refresco_item_id(name)
                `)
                .single();

            if (createError) {
                if (createError.code === '23505') { // Postgres UNIQUE constraint violation
                    return res.status(400).json({ error: 'Ya has realizado un pedido el día de hoy.' });
                }
                throw createError;
            }

            res.status(201).json(newOrder);
        } catch (error) {
            console.error('Error al crear pedido:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // 5. Cancelar el pedido del día actual (permite volver a pedir)
    cancelMyTodayOrder: async (req, res) => {
        try {
            const userId = req.user.id;
            const today = getElSalvadorDate();

            const { data: existingOrder, error: findError } = await supabaseAdmin
                .from('lunch_orders')
                .select('*')
                .eq('user_id', userId)
                .eq('date', today)
                .maybeSingle();

            if (findError || !existingOrder) {
                return res.status(404).json({ error: 'No tienes ningún pedido activo para el día de hoy.' });
            }

            if (existingOrder.status === 'entregado') {
                return res.status(400).json({ error: 'No puedes cancelar un pedido que ya ha sido entregado.' });
            }

            const { error: deleteError } = await supabaseAdmin
                .from('lunch_orders')
                .delete()
                .eq('id', existingOrder.id);

            if (deleteError) throw deleteError;

            res.json({ message: 'Pedido cancelado correctamente. Ahora puedes realizar un nuevo pedido.' });
        } catch (error) {
            console.error('Error al cancelar pedido:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = lunchController;
