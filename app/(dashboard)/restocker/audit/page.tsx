'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MasterAudit() {
  const [logs, setLogs] = useState<any[]>([]);
  
  useEffect(() => {
    async function fetchAllLogs() {
      const { data } = await supabase
        .from('auditlogs')
        .select('*')
        .order('changedate', { ascending: false });
      setLogs(data || []);
    }
    fetchAllLogs();
  }, []);

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <h2 className="text-4xl font-black text-[#263A29] mb-10 uppercase tracking-tighter">Master Database Audit</h2>
      
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <tr>
              <th className="p-8">Timestamp</th>
              <th className="p-8">Table</th>
              <th className="p-8">Operation</th>
              <th className="p-8">System Payload (JSON)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.map((log) => (
              <tr key={log.logid} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-8 text-xs font-bold text-gray-400">{new Date(log.changedate).toLocaleString()}</td>
                <td className="p-8 font-black text-[#263A29] text-xs uppercase">{log.tablename}</td>
                <td className="p-8">
                  <span className="bg-black text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase">{log.operation}</span>
                </td>
                <td className="p-8 text-[10px] font-mono text-gray-500 max-w-xs truncate">
                  {JSON.stringify(log.newvalues || log.oldvalues)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}