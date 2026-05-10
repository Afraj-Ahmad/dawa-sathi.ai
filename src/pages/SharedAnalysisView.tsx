import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Activity, Pill, AlertCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function SharedAnalysisView() {
  const { shareId } = useParams<{ shareId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedData = async () => {
      if (!shareId) return;
      try {
        const docRef = doc(db, 'shared_analyses', shareId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setData(docSnap.data());
        } else {
          setError("This link has expired or doesn't exist.");
        }
      } catch (err) {
        console.error(err);
        setError("This link has expired or doesn't exist.");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedData();
  }, [shareId]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading shared analysis...</div>;
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-16 text-center space-y-6">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Link Invalid</h2>
        <p className="text-slate-600">{error}</p>
        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition">
          <ArrowLeft className="w-4 h-4" /> Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-12 pb-24">
      <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${data.type === 'prescription' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {data.type === 'prescription' ? <Pill className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Shared {data.type === 'prescription' ? 'Prescription' : 'Lab Report'}
            </h2>
            <p className="text-sm font-medium text-slate-500">
              Shared on {format(data.createdAt.toDate(), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
      </div>

      {data.type === 'prescription' ? (
        <div className="space-y-6">
           {data.data.medicines?.map((med: any, i: number) => (
             <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
               <h4 className="text-xl font-black text-slate-900">{med.name} <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded ml-2">{med.strength}</span></h4>
               <p className="text-sm text-slate-600 mt-2"><span className="font-bold">Purpose:</span> {med.purpose}</p>
               <p className="text-sm text-slate-600 mt-1"><span className="font-bold">Dosage:</span> {med.dosage} ({med.duration})</p>
             </div>
           ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-emerald-500 text-white p-6 rounded-2xl shadow-lg">
             <p className="text-xs font-black uppercase tracking-widest text-emerald-100 mb-1">Recommended Action</p>
             <p className="text-xl font-bold">Consult a {data.data.recommendedDoctorDepartment}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Summary</h4>
             <p className="text-slate-800 font-medium leading-relaxed">{data.data.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}
