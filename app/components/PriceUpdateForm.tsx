'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { updateProductPrice } from '../actions';

export default function PriceUpdateForm({ allProducts }: { allProducts: any[] }) {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const result = await updateProductPrice(formData);
    
    if (result?.success) {
      toast.success('Price updated successfully!');
      router.refresh(); // This tells Next.js to fetch the new price data immediately
    } else {
      toast.error('Failed to update price.');
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div>
        <label className="text-[10px] font-bold text-brand-accent uppercase ml-1 tracking-wider">Select Product</label>
        <select 
          name="productName" 
          required 
          className="w-full p-4 mt-2 bg-brand-bg border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all text-sm font-medium"
        >
          <option value="">Choose item...</option>
          {allProducts?.map(p => (
            <option key={p.productid} value={p.productname}>{p.productname}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-bold text-brand-accent uppercase ml-1 tracking-wider">New Price ($)</label>
        <input 
          name="price" 
          type="number" 
          step="0.01" 
          className="w-full p-4 mt-2 bg-brand-bg border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all text-sm font-medium" 
          placeholder="0.00" 
          required 
        />
      </div>
      <button 
        type="submit" 
        className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-brand-deep transition-all shadow-xl shadow-brand-primary/20 active:scale-[0.98] mt-4"
      >
        Apply Global Update
      </button>
    </form>
  );
}