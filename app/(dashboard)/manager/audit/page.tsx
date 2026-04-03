'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- MODAL STATE ---
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        // Using the join defined in your schema
        const { data: logData, error: logError } = await supabase
          .from('auditlogs')
          .select(`
            logid, 
            tablename, 
            operation, 
            oldvalues, 
            newvalues, 
            changedate,
            changedby,
            staff:users!changedby (fullname)
          `)
          .order('changedate', { ascending: false });

        if (logError) {
          console.error("Audit fetch error:", logError.message);
          setLoading(false);
          return;
        }

        // FIX: Handle the case where Supabase returns 'staff' as an array
        const mappedLogs = logData?.map(log => {
          const staffData = Array.isArray(log.staff) ? log.staff[0] : log.staff;
          
          return {
            ...log,
            staffName: staffData?.fullname || `Staff #${log.changedby}`
          };
        });

        setLogs(mappedLogs || []);
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  // Helper to make JSON look nice in the table
  const formatJson = (val: any) => {
    if (!val) return 'None';
    return JSON.stringify(val, null, 2);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-[#263A29] tracking-tighter uppercase">Audit Trail</h2>
          <p className="text-gray-500 font-medium italic">Click any record to inspect data differences.</p>
        </div>
      </header>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-32 text-center animate-pulse font-black text-gray-300 uppercase tracking-widest">
            Syncing Relational Data...
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-[#F9FBF9] text-[10px] font-black uppercase tracking-widest text-[#41644A]">
              <tr>
                <th className="p-8">Timestamp</th>
                <th className="p-8">Staff / Table</th>
                <th className="p-8">Operation</th>
                <th className="p-8">Data Change Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr 
                  key={log.logid} 
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-green-50/50 transition-colors cursor-pointer group"
                >
                  <td className="p-8 text-xs font-bold text-gray-400">
                    {new Date(log.changedate).toLocaleString()}
                  </td>
                  <td className="p-8">
                    <p className="font-black text-[#263A29] group-hover:text-[#41644A]">{log.staffName}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                      Table: {log.tablename}
                    </p>
                  </td>
                  <td className="p-8">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border ${
                      log.operation.includes('INSERT') ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                      log.operation.includes('UPDATE') ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                      'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {log.operation}
                    </span>
                  </td>
                  <td className="p-8">
                    <div className="max-w-md bg-gray-50 p-4 rounded-2xl border border-gray-100">
                       <pre className="text-[10px] font-mono text-gray-600 whitespace-pre-wrap break-all max-h-24 overflow-hidden">
                         {formatJson(log.newvalues || log.oldvalues)}
                       </pre>
                       <p className="text-[9px] font-black text-[#41644A] mt-2 uppercase">Click to expand details</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- AUDIT DETAIL MODAL --- */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <span className="text-[10px] font-black text-white bg-[#41644A] px-3 py-1 rounded-full uppercase mb-2 inline-block">
                  {selectedLog.operation}
                </span>
                <h3 className="text-2xl font-black text-[#263A29]">Log #{selectedLog.logid} Details</h3>
                <p className="text-xs font-bold text-gray-400 mt-1">Modified by {selectedLog.staffName} on {selectedLog.tablename}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-gray-300 hover:text-red-500 text-3xl font-black">✕</button>
            </div>

            <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-red-400 tracking-widest">Previous Values (OLD)</h4>
                <pre className="p-6 bg-red-50/50 rounded-[30px] border border-red-100 text-xs font-mono text-red-700 overflow-x-auto">
                  {formatJson(selectedLog.oldvalues)}
                </pre>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-green-600 tracking-widest">New Values (NEW)</h4>
                <pre className="p-6 bg-green-50/50 rounded-[30px] border border-green-100 text-xs font-mono text-green-700 overflow-x-auto">
                  {formatJson(selectedLog.newvalues)}
                </pre>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50">
              <button 
                onClick={() => setSelectedLog(null)}
                className="w-full py-4 bg-[#263A29] text-white rounded-2xl font-black uppercase text-xs tracking-widest"
              >
                Done Reviewing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}