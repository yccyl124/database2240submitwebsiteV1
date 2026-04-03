'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Database, Clock, User, ChevronRight, Activity, Terminal } from 'lucide-react';

export default function MasterAudit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  
  useEffect(() => {
    async function fetchAllLogs() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('auditlogs')
          .select(`
            logid, tablename, operation, oldvalues, newvalues, changedate,
            staff:users!changedby (fullname)
          `)
          .order('changedate', { ascending: false });

        if (!error && data) setLogs(data);
      } finally {
        setLoading(false);
      }
    }
    fetchAllLogs();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-[#263A29] tracking-tighter uppercase flex items-center gap-3">
            <Database size={36} className="text-[#41644A]" /> Master Audit
          </h2>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">Relational integrity & event tracking</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 text-[#263A29]">
           <Activity size={18} className="text-green-500" />
           <span className="text-[10px] font-black uppercase tracking-widest">{logs.length} System Events</span>
        </div>
      </header>
      
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl overflow-hidden">
        {loading ? (
          <div className="p-32 text-center animate-pulse font-black text-gray-300 uppercase tracking-widest">Compiling System History...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F9FBF9] text-[10px] font-black uppercase tracking-widest text-[#41644A] border-b border-gray-100">
                <tr>
                  <th className="p-8">Event Timestamp</th>
                  <th className="p-8">Actor / Target</th>
                  <th className="p-8">Operation Type</th>
                  <th className="p-8 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <React.Fragment key={log.logid}>
                    <tr className={`hover:bg-gray-50/50 transition-all cursor-pointer ${expandedLog === log.logid ? 'bg-green-50/30' : ''}`} onClick={() => setExpandedLog(expandedLog === log.logid ? null : log.logid)}>
                      <td className="p-8">
                        <div className="flex items-center gap-3 text-gray-400">
                          <Clock size={14} />
                          <span className="text-xs font-bold">{new Date(log.changedate).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-8">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#263A29] rounded-lg flex items-center justify-center text-white text-[10px] font-black uppercase">
                            {log.staff?.fullname?.substring(0, 2) || 'SY'}
                          </div>
                          <div>
                            <p className="font-black text-[#263A29] text-xs uppercase">{log.staff?.fullname || 'System Auth'}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Table: {log.tablename}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-8">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          log.operation.includes('INSERT') ? 'bg-blue-50 text-blue-600' : 
                          log.operation.includes('UPDATE') ? 'bg-orange-50 text-orange-600' : 
                          'bg-red-50 text-red-600'
                        }`}>
                          {log.operation}
                        </span>
                      </td>
                      <td className="p-8 text-right">
                         <ChevronRight className={`inline-block transition-transform text-gray-300 ${expandedLog === log.logid ? 'rotate-90 text-[#41644A]' : ''}`} size={20} />
                      </td>
                    </tr>
                    
                    {/* EXPANDABLE JSON DETAIL */}
                    {expandedLog === log.logid && (
                      <tr>
                        <td colSpan={4} className="p-8 bg-gray-50/50 border-t border-gray-100">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top duration-300">
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
                                  <Terminal size={12}/> State Before
                                </h4>
                                <pre className="bg-[#263A29] p-6 rounded-[25px] text-[10px] font-mono text-green-400 overflow-x-auto shadow-inner">
                                  {JSON.stringify(log.oldvalues, null, 2) || '// No prior state'}
                                </pre>
                              </div>
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
                                  <Terminal size={12}/> State After
                                </h4>
                                <pre className="bg-[#263A29] p-6 rounded-[25px] text-[10px] font-mono text-green-400 overflow-x-auto shadow-inner">
                                  {JSON.stringify(log.newvalues, null, 2) || '// No changes applied'}
                                </pre>
                              </div>
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Ensure React is imported for Fragment
import React from 'react';