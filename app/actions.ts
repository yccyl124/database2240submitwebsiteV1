'use server'
import { supabase } from '../lib/supabase';
import { revalidatePath } from 'next/cache';

export async function updateProductPrice(formData: FormData) {
  const productName = formData.get('productName');
  const newPrice = parseFloat(formData.get('price') as string);
  const staffId = formData.get('staffId'); // Recommended: pass this from the form

  // 1. Get current product info
  // NEW SCHEMA: Querying 'name' instead of 'productname'
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('productid, currentprice')
    .eq('name', productName)
    .single();

  if (fetchError || !product) {
    console.error("Product not found:", productName);
    return { success: false, message: "Product not found" };
  }

  // 2. Update the Price in the 'products' table
  const { error: updateError } = await supabase
    .from('products')
    .update({ currentprice: newPrice })
    .eq('productid', product.productid);

  if (updateError) {
    console.error("Update Error:", updateError.message);
    return { success: false, message: "Update failed" };
  }

  // 3. Log the change to 'auditlogs'
  // NEW SCHEMA: Column names match your RTF exactly
  const { error: logError } = await supabase
    .from('auditlogs')
    .insert([{
      tablename: 'products',
      recordid: product.productid,
      operation: 'UPDATE',
      oldvalues: { currentprice: product.currentprice }, // JSONB format
      newvalues: { currentprice: newPrice },             // JSONB format
      changedby: staffId ? parseInt(staffId as string) : 1, // Must be a valid User ID (integer)
      changedate: new Date().toISOString()
    }]);

  if (logError) {
    console.error("Logging Error:", logError.message);
    // We don't return false here because the price update actually succeeded
  }

  // 4. Revalidate paths to show fresh data
  revalidatePath('/'); 
  revalidatePath('/restocker/pricing');
  
  return { success: true };
}