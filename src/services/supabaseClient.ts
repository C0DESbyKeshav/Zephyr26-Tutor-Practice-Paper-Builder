import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://demo-antigravity.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-anon-key-placeholder';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class SupabaseService {
  /**
   * Invokes the generate-paper Edge Function
   */
  static async generatePaperForStudent(studentId: string, targetDate?: string) {
    try {
      const { data, error } = await supabase.functions.invoke('generate-paper', {
        body: { student_id: studentId, target_date: targetDate },
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase Edge Function fallback to local generation:', err);
      return null;
    }
  }

  /**
   * Invokes the prep-todays-papers Edge Function (Edge Case 4 Queue)
   */
  static async prepTodaysPapersBatch() {
    try {
      const { data, error } = await supabase.functions.invoke('prep-todays-papers', {
        body: { trigger: 'fab_tap' },
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase Edge Function batch fallback to local queue:', err);
      return null;
    }
  }
}
