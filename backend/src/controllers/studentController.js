const { supabaseAdmin } = require('../config/supabase');

const studentController = {
    getGrades: async (req, res) => {
        try {
            const student_id = req.user.id;
            const { period } = req.query;

            let query = supabaseAdmin
                .from('grades')
                .select('*, subjects(name)')
                .eq('student_id', student_id);

            if (period) {
                query = query.eq('period', period);
            }

            const { data, error } = await query;
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getDiary: async (req, res) => {
        try {
            const student_id = req.user.id;
            const { period } = req.query;

            const { data: conduct, error: conductError } = await supabaseAdmin
                .from('conduct_records')
                .select('*, conduct_codes(*)')
                .eq('student_id', student_id)
                .eq('period', period);

            const { data: attendance, error: attendanceError } = await supabaseAdmin
                .from('attendance')
                .select('*')
                .eq('student_id', student_id)
                .eq('period', period);

            if (conductError || attendanceError) throw conductError || attendanceError;

            res.json({ conduct, attendance });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    requestJustification: async (req, res) => {
        try {
            const student_id = req.user.id;
            const { absence_date, reason, evidence_url } = req.body;

            const { data, error } = await supabaseAdmin
                .from('justifications')
                .insert([{
                    student_id,
                    absence_date,
                    reason,
                    evidence_url,
                    status: 'pending'
                }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getJustificationRequests: async (req, res) => {
        try {
            const student_id = req.user.id;
            const { data, error } = await supabaseAdmin
                .from('justifications')
                .select('*')
                .eq('student_id', student_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getSchedule: async (req, res) => {
        try {
            const { grade, section } = req.user;
            const { data, error } = await supabaseAdmin
                .from('schedules')
                .select('*, subjects(name), profiles!schedules_teacher_id_fkey(full_name)')
                .eq('grade', grade)
                .eq('section', section)
                .order('day_of_week', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = studentController;
