import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Upload, Camera, Search, RefreshCw, AlertCircle, X, Activity, CheckCircle2, TrendingDown, Stethoscope, Pill, ArrowRight, Zap, Play, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { LabReportAnalysis, LabMetric } from '../types';
import { auth, db } from '../firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function LabReport() {
  const [image, setImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<LabReportAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const isApiKeyMissing = !process.env.GEMINI_API_KEY;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB limit.");
        return;
      }
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setError("Please upload a valid image or PDF file.");
        return;
      }
      setIsUploading(true);
      setUploadProgress(0);
      
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysis(null);
        setError(null);
        setIsUploading(false);
        setUploadProgress(100);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please check permissions.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
        setAnalysis(null);
      }
    }
  };

  const saveToHistory = async (result: LabReportAnalysis) => {
    if (!auth.currentUser) return; // Only save if logged in
    
    try {
      const newAnalysisRef = doc(collection(db, 'users', auth.currentUser.uid, 'analyses'));
      await setDoc(newAnalysisRef, {
        userId: auth.currentUser.uid,
        type: 'lab_report',
        createdAt: serverTimestamp(),
        data: result
      }).catch((e) => handleFirestoreError(e, OperationType.CREATE, `users/${auth.currentUser?.uid}/analyses/${newAnalysisRef.id}`));
    } catch (error) {
      console.error("Failed to save to history", error);
    }
  };

  const analyzeReport = async (retryCount = 0, modelIndex = 0): Promise<void> => {
    if (!image) return;

    const models = ["gemini-3.1-pro-preview", "gemini-3-flash-preview"];
    const currentModel = models[modelIndex];

    setIsAnalyzing(true);
    setError(null);

    try {
      const base64Data = image.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: image.startsWith('data:application/pdf') ? "application/pdf" : "image/jpeg",
                  data: base64Data,
                },
              },
              {
                text: "Analyze this medical lab report carefully. Extract specific health metrics (like Hemoglobin, WBC, Glucose, etc.), their values, units, and normal ranges. Evaluate their status ('normal', 'high', 'low', 'unknown') and provide medical implications for abnormal ones. Outline good points, negative points (abnormalities), possible diseases or body changes. Recommend any further tests, medicine suggestions, and most importantly, the specific medical department or specialist to consult. Provide output in strict JSON format.",
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              patientInfo: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  age: { type: Type.STRING },
                  date: { type: Type.STRING },
                },
              },
              metrics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    value: { type: Type.STRING },
                    unit: { type: Type.STRING },
                    normalRange: { type: Type.STRING },
                    status: { type: Type.STRING },
                    implication: { type: Type.STRING },
                  },
                  required: ["name", "value", "status"],
                },
              },
              goodPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              negativePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              possibleDiseases: { type: Type.ARRAY, items: { type: Type.STRING } },
              possibleBodyChanges: { type: Type.ARRAY, items: { type: Type.STRING } },
              testSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              medicineSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedDoctorDepartment: { type: Type.STRING },
              summary: { type: Type.STRING },
            },
            required: ["goodPoints", "negativePoints", "recommendedDoctorDepartment", "summary"],
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      setAnalysis(result);
      await saveToHistory(result);
    } catch (err: any) {
      console.error(`Error with model ${currentModel}:`, err);
      if ((err.status === 503 || err.status === 429) && retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1500;
        setTimeout(() => analyzeReport(retryCount + 1, modelIndex), delay);
        return;
      }
      if (modelIndex < models.length - 1) {
        analyzeReport(0, modelIndex + 1);
        return;
      }
      setError("The AI service is currently experiencing high demand. Please wait 30 seconds and try one more time.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadPDF = async () => {
    if (!resultsRef.current) return;
    try {
      const element = resultsRef.current;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`lab_report_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-8 pb-20">
      {isApiKeyMissing && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col md:flex-row items-center gap-4 text-amber-800">
           {/* API Key warning same as App.tsx */}
           <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
           <p className="font-bold flex-1">API Key missing. Add GEMINI_API_KEY to environment variables.</p>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black flex items-center gap-3 text-slate-900">
          <Activity className="w-8 h-8 text-emerald-500" /> Lab Report Analysis
        </h2>
        {analysis && (
          <button onClick={() => { setImage(null); setAnalysis(null); setError(null); }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition">
            <RefreshCw className="w-4 h-4" /> Start New
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Column */}
        <div className={cn("space-y-6", analysis ? "lg:col-span-4" : "lg:col-span-12 max-w-2xl mx-auto w-full")}>
           <motion.div layout className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
              {!image && !isCameraOpen ? (
                <div className="space-y-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed border-emerald-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-emerald-600 hover:bg-emerald-50 transition-all group relative",
                      isUploading && "opacity-50 pointer-events-none"
                    )}
                  >
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    
                    {isUploading ? (
                      <div className="text-center w-full max-w-xs">
                        <p className="text-lg font-semibold text-slate-900 mb-2">Uploading... {uploadProgress}%</p>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-lg font-semibold text-slate-900">Click to upload report</p>
                        <p className="text-sm text-slate-500">Image or PDF (max. 10MB)</p>
                      </div>
                    )}
                    <input 
                      type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf" className="hidden"
                    />
                  </div>
                  <div className="flex items-center justify-center py-2"><span className="text-xs font-bold text-slate-400 uppercase">or</span></div>
                  <button onClick={startCamera} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-md">
                    <Camera className="w-5 h-5" /> Use Camera
                  </button>
                </div>
              ) : isCameraOpen ? (
                 <div className="space-y-4">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-slate-200">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <button onClick={stopCamera} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full backdrop-blur-sm"><X className="w-5 h-5" /></button>
                    </div>
                    <button onClick={capturePhoto} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-700 shadow-md">
                      Capture Report
                    </button>
                    <canvas ref={canvasRef} className="hidden" />
                 </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 group">
                    {image?.startsWith('data:application/pdf') ? (
                      <div className="w-full h-full relative">
                        <iframe src={`${image}#toolbar=0`} className="w-full h-full rounded-2xl absolute inset-0 z-10" title="PDF Preview" />
                      </div>
                    ) : (
                      <img src={image!} alt="Report" className="w-full h-full object-contain" />
                    )}
                    {isAnalyzing && <motion.div initial={{ top: "0%" }} animate={{ top: "100%" }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-20" />}
                    {!analysis && !isAnalyzing && (
                      <button onClick={() => setImage(null)} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><RefreshCw className="w-4 h-4" /></button>
                    )}
                  </div>
                  {!analysis && (
                    <button onClick={() => analyzeReport()} disabled={isAnalyzing} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2">
                      {isAnalyzing ? <><RefreshCw className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Search className="w-5 h-5" /> Analyze Now</>}
                    </button>
                  )}
                </div>
              )}
           </motion.div>
           {error && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
        </div>

        {/* Results Column */}
        <AnimatePresence mode="wait">
          {analysis && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="lg:col-span-8 space-y-6">
              
              <div className="flex justify-end mb-4">
                <button 
                  onClick={downloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-medical-600 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 dark:hover:bg-medical-700 transition"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>

              <div ref={resultsRef} className="space-y-6 bg-transparent">
                <div className="bg-emerald-500 text-white p-6 rounded-[2rem] shadow-lg flex items-start gap-4">
                   <div className="bg-white/20 p-3 rounded-2xl shrink-0"><Stethoscope className="w-8 h-8" /></div>
                   <div>
                     <h3 className="text-xs uppercase font-black tracking-widest text-emerald-100 mb-1">Recommended Action</h3>
                     <p className="text-2xl font-bold">Consult a {analysis.recommendedDoctorDepartment}</p>
                   </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h4 className="text-sm uppercase font-black tracking-widest text-slate-400">Summary</h4>
                  <p className="text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{analysis.summary}</p>
                </div>

                {analysis.metrics && analysis.metrics.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <h4 className="font-bold text-lg mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                       <Activity className="w-5 h-5 text-medical-500" /> Key Metrics
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                        <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-300">
                          <tr>
                            <th className="px-4 py-3 font-bold rounded-tl-xl">Metric</th>
                            <th className="px-4 py-3 font-bold">Value</th>
                            <th className="px-4 py-3 font-bold">Range</th>
                            <th className="px-4 py-3 font-bold">Status</th>
                            <th className="px-4 py-3 font-bold rounded-tr-xl">Implications</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {analysis.metrics.map((metric, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{metric.name}</td>
                              <td className="px-4 py-3">{metric.value} {metric.unit}</td>
                              <td className="px-4 py-3">{metric.normalRange}</td>
                              <td className="px-4 py-3">
                                <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider", 
                                  metric.status === 'normal' ? 'bg-emerald-100 text-emerald-700' : 
                                  metric.status === 'high' ? 'bg-red-100 text-red-700' :
                                  metric.status === 'low' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'
                                )}>
                                  {metric.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs">{metric.implication || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-emerald-100 dark:border-emerald-900/50 space-y-4">
                    <h4 className="font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-5 h-5" /> Good Indicators</h4>
                    <ul className="space-y-2">
                      {analysis.goodPoints?.map((pt, i) => (
                        <li key={i} className="flex gap-2 text-sm font-medium text-slate-600 dark:text-slate-400"><span className="text-emerald-500">•</span> {pt}</li>
                      ))}
                      {(!analysis.goodPoints || analysis.goodPoints.length === 0) && <li className="text-sm text-slate-400 italic">None noted.</li>}
                    </ul>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-red-100 dark:border-red-900/50 space-y-4">
                    <h4 className="font-bold flex items-center gap-2 text-red-700 dark:text-red-400"><TrendingDown className="w-5 h-5" /> Abnormalities / Risks</h4>
                    <ul className="space-y-2">
                      {analysis.negativePoints?.map((pt, i) => (
                        <li key={i} className="flex gap-2 text-sm font-medium text-slate-600 dark:text-slate-400"><span className="text-red-500">•</span> {pt}</li>
                      ))}
                      {(!analysis.negativePoints || analysis.negativePoints.length === 0) && <li className="text-sm text-slate-400 italic">None noted.</li>}
                    </ul>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                   {analysis.possibleDiseases && analysis.possibleDiseases.length > 0 && (
                     <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-[2rem] space-y-3">
                       <h4 className="font-bold text-orange-800 dark:text-orange-300 text-sm uppercase tracking-wider">Possible Conditions</h4>
                       <div className="flex flex-wrap gap-2">
                         {analysis.possibleDiseases.map((d, i) => <span key={i} className="px-3 py-1 bg-white dark:bg-orange-900/50 text-orange-700 dark:text-orange-200 rounded-lg text-sm font-bold shadow-sm">{d}</span>)}
                       </div>
                     </div>
                   )}

                   {analysis.possibleBodyChanges && analysis.possibleBodyChanges.length > 0 && (
                     <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-[2rem] space-y-3">
                       <h4 className="font-bold text-purple-800 dark:text-purple-300 text-sm uppercase tracking-wider">Body Changes / Symptoms</h4>
                       <ul className="space-y-1 text-sm text-purple-700 dark:text-purple-300 font-medium">
                         {analysis.possibleBodyChanges.map((c, i) => <li key={i}>~ {c}</li>)}
                       </ul>
                     </div>
                   )}
                </div>

                {(analysis.testSuggestions?.length > 0 || analysis.medicineSuggestions?.length > 0) && (
                  <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col md:flex-row gap-8">
                    {analysis.testSuggestions?.length > 0 && (
                      <div className="flex-1 space-y-4">
                        <h4 className="flex items-center gap-2 text-blue-400 font-bold"><Activity className="w-4 h-4" /> Suggested Next Tests</h4>
                        <ul className="space-y-2 text-sm text-slate-300 font-medium">
                          {analysis.testSuggestions.map((t, i) => <li key={i} className="flex gap-2"><ArrowRight className="w-4 h-4 shrink-0 text-blue-500" /> {t}</li>)}
                        </ul>
                      </div>
                    )}
                    {analysis.medicineSuggestions?.length > 0 && (
                      <div className="flex-1 space-y-4">
                        <h4 className="flex items-center gap-2 text-pink-400 font-bold"><Pill className="w-4 h-4" /> General Medicine Suggestions</h4>
                        <ul className="space-y-2 text-sm text-slate-300 font-medium border-l-2 border-pink-500/30 pl-4">
                          {analysis.medicineSuggestions.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                        <p className="text-[10px] text-slate-500 mt-2 italic">*Consult doctor before taking any medication</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
