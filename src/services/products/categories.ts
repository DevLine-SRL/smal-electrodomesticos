import { supabase } from '../../db/supabase';

export const getActiveCategories = async () => {
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('active', true)
    .order('name');
  return data ?? [];
};
