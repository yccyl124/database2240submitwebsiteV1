'use server'
import { supabase } from '../lib/supabase';
import { revalidatePath } from 'next/cache';

export async function updateProductPrice(formData: FormData) {
  const productName = formData.get('productName');
  const newPrice = parseFloat(formData.get('price') as string);

  // 1. Get the current product info for the Audit Log
  const { data: product } = await supabase
    .from('products')
    .select('productid, currentprice')
    .eq('productname', productName)
    .single();

  if (!product) return { success: false };

  // 2. Update the Price
  const { error: updateError } = await supabase
    .from('products')
    .update({ currentprice: newPrice })
    .eq('productid', product.productid);

  if (updateError) return { success: false };

  // 3. Log the change to 'auditlogs' (Using your exact column names)
  const { error: logError } = await supabase
    .from('auditlogs')
    .insert([{
      tablename: 'products',
      operation: 'UPDATE',
      recordid: product.productid,
      changedate: new Date().toISOString(),
      oldvalues: { price: product.currentprice }, // Sending as JSONB object
      newvalues: { price: newPrice },             // Sending as JSONB object
      changedby: 1 // Assuming 1 is your system user ID
    }]);

  if (logError) console.error("Logging Error:", logError.message);

  // 4. Tell the Home Page to refresh the data
  revalidatePath('/'); 
  
  return { success: true };
}