import { getSupabaseClient } from '../server/src/storage/database/supabase-client';
import { DEFAULT_CATEGORIES } from '../src/data';

async function syncCategories() {
  const client = getSupabaseClient();
  
  console.log('Fetching existing categories...');
  const { data: existingCats, error: fetchErr } = await client.from('categories').select('*');
  
  if (fetchErr) {
    console.error('Error fetching categories:', fetchErr);
    process.exit(1);
  }

  // Insert new categories that don't exist yet
  for (const cat of DEFAULT_CATEGORIES) {
    const exists = existingCats.find((c: any) => c.id === cat.id);
    if (exists) {
      // Update it
      await client.from('categories').update({
        name: cat.name,
        icon: cat.icon,
        sort_order: cat.sort_order
      }).eq('id', cat.id);
      console.log(`Updated category: ${cat.name}`);
    } else {
      // Insert it
      await client.from('categories').insert({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        sort_order: cat.sort_order
      });
      console.log(`Inserted category: ${cat.name}`);
    }
  }

  console.log('Categories synced successfully without touching products!');
}

syncCategories().catch(console.error);
