import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { HistoryItem } from '../types';
import { format } from 'date-fns';
import { History as HistoryIcon, Pill, Activity, UserCircle, Share2, Copy } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';

export default function History() {
  const { user } = useAuth();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "History | dawa sathi.ai";
  }, []);

  const [filterType, setFilterType] = useState<'all' | 'prescription' | 'lab_report'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [sortColumn, setSortColumn] = useState<'date' | 'type'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [sharingId, setSharingId] = useState<string | null>(null);
  const [sharedLink, setSharedLink] = useState<string | null>(null);

  const handleShare = async (item: HistoryItem) => {
    setSharingId(item.id);
    setSharedLink(null);
    try {
      if (!user) return;
      const shareData = {
        ownerId: user.uid,
        type: item.type,
        data: item.data,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
      };
      
      const newShareRef = doc(collection(db, 'shared_analyses'));
      await setDoc(newShareRef, shareData);
      
      const link = `${window.location.origin}/shared/${newShareRef.id}`;
      setSharedLink(link);
    } catch (err) {
      console.error('Sharing failed', err);
      alert('Failed to generate sharing link.');
    } finally {
      setSharingId(null);
    }
  };

  const copyLink = () => {
    if (sharedLink) {
      navigator.clipboard.writeText(sharedLink);
      alert('Link copied to clipboard!');
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const q = query(collection(db, 'users', user.uid, 'analyses'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q).catch(e => {
          handleFirestoreError(e, OperationType.LIST, `users/${user.uid}/analyses`);
          return null;
        });

        if (querySnapshot) {
          const items: HistoryItem[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            items.push({
              id: doc.id,
              userId: data.userId,
              type: data.type,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
              data: data.data,
            });
          });
          setHistoryItems(items);
        }
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading history...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-16 text-center space-y-6">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
          <UserCircle className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Sign in required</h2>
        <p className="text-slate-600">Please sign in to view your scan history.</p>
      </div>
    );
  }

  let filteredItems = historyItems.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (startDate && new Date(item.createdAt) < new Date(startDate)) return false;
    if (endDate && new Date(item.createdAt) > new Date(new Date(endDate).getTime() + 86400000)) return false; 
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (item.type === 'prescription') {
        const names = (item.data as any).medicines?.map((m: any) => m.name.toLowerCase()).join(' ');
        if (!names?.includes(term)) return false;
      } else {
        const summary = (item.data as any).summary?.toLowerCase() || '';
        if (!summary.includes(term)) return false;
      }
    }
    
    return true;
  });

  filteredItems.sort((a, b) => {
    let comp = 0;
    if (sortColumn === 'date') {
      comp = a.createdAt.getTime() - b.createdAt.getTime();
    } else if (sortColumn === 'type') {
      comp = a.type.localeCompare(b.type);
    }
    return sortDirection === 'asc' ? comp : -comp;
  });

  const handleSort = (col: 'date' | 'type') => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-12 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
          <HistoryIcon className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-3xl font-black text-slate-900">My History</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Search</label>
            <input 
              type="text" 
              placeholder="Search medicine or summary..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-medium text-slate-700 outline-none focus:border-medical-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Analysis Type</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-medium text-slate-700 outline-none focus:border-medical-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="all">All Types</option>
              <option value="prescription">Prescriptions</option>
              <option value="lab_report">Lab Reports</option>
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Start Date</label>
            <input 
              type="date" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-medium text-slate-700 outline-none focus:border-medical-500"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">End Date</label>
            <input 
              type="date" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-medium text-slate-700 outline-none focus:border-medical-500"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center bg-white border border-dashed border-slate-300 rounded-[2rem] p-16">
          <p className="text-xl text-slate-500 font-medium mb-6">No history found for these filters.</p>
          <div className="flex justify-center gap-4">
            <Link to="/prescription" className="px-6 py-3 bg-medical-50 text-medical-700 font-bold rounded-xl hover:bg-medical-100 transition">
              Scan Prescription
            </Link>
            <Link to="/lab-report" className="px-6 py-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition">
              Analyze Lab Report
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {sharedLink && (
            <div className="bg-medical-50 border border-medical-200 p-4 rounded-xl flex items-center justify-between gap-4 mb-6">
              <div className="flex-1 truncate">
                <p className="text-xs font-bold text-medical-800 uppercase tracking-wider mb-1">Share Link Generated (Valid for 7 days)</p>
                <p className="text-sm text-medical-900 font-medium truncate">{sharedLink}</p>
              </div>
              <button 
                onClick={copyLink}
                className="px-4 py-2 bg-medical-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-medical-700 flex items-center gap-2 shrink-0"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
          )}
          
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th 
                      onClick={() => handleSort('date')}
                      className="p-4 text-xs uppercase tracking-wider font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors w-48"
                    >
                      Date {sortColumn === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('type')}
                      className="p-4 text-xs uppercase tracking-wider font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors w-48"
                    >
                      Type {sortColumn === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-4 text-xs uppercase tracking-wider font-bold text-slate-500">
                      Details
                    </th>
                    <th className="p-4 text-xs uppercase tracking-wider font-bold text-slate-500 w-32 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 align-top">
                        <span className="font-semibold text-slate-900 block whitespace-nowrap">
                          {format(item.createdAt, 'MMM d, yyyy')}
                        </span>
                        <span className="text-xs text-slate-500">
                          {format(item.createdAt, 'h:mm a')}
                        </span>
                      </td>
                      <td className="p-4 align-top">
                        {item.type === 'prescription' ? (
                          <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg w-max font-bold text-xs ring-1 ring-blue-200">
                            <Pill className="w-4 h-4" /> Prescription
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg w-max font-bold text-xs ring-1 ring-emerald-200">
                            <Activity className="w-4 h-4" /> Lab Report
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-top">
                        {item.type === 'prescription' ? (
                          <div className="space-y-2">
                             <p className="text-sm text-slate-600">
                               <span className="font-semibold text-slate-900">Medicines found:</span> {(item.data as any).medicines?.length || 0}
                             </p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {(item.data as any).medicines?.slice(0, 3).map((m: any, i: number) => (
                                <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-600 font-medium whitespace-nowrap">
                                  {m.name}
                                </span>
                              ))}
                              {((item.data as any).medicines?.length || 0) > 3 && (
                                <span className="px-2 py-1 text-slate-400 font-medium">+{(item.data as any).medicines.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                             <p className="text-sm text-slate-600 line-clamp-2 max-w-xl">
                              <span className="font-semibold text-slate-900">Summary:</span> {(item.data as any).summary}
                             </p>
                            <p className="text-xs font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-1 rounded-md mt-1 border border-emerald-100">
                              Recommend: {(item.data as any).recommendedDoctorDepartment}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-top text-right">
                        <button 
                          onClick={() => handleShare(item)} 
                          disabled={sharingId === item.id} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm disabled:opacity-50"
                        >
                          <Share2 className="w-3.5 h-3.5" /> 
                          {sharingId === item.id ? 'Generating...' : 'Share'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
