import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  FileText, 
  Pill, 
  Info, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  RefreshCw,
  Camera,
  Search,
  ArrowRight,
  ShoppingBag,
  ExternalLink,
  X,
  Zap,
  Clock,
  Calendar,
  Stethoscope,
  ClipboardList,
  Sun,
  Moon,
  Coffee,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { PrescriptionAnalysis, Medicine } from '../types';

import { auth, db } from '../firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function Prescription() {
  const [image, setImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PrescriptionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const isApiKeyMissing = !process.env.GEMINI_API_KEY;

  const saveToHistory = async (result: PrescriptionAnalysis) => {
    if (!auth.currentUser) return;
    try {
      const newAnalysisRef = doc(collection(db, 'users', auth.currentUser.uid, 'analyses'));
      await setDoc(newAnalysisRef, {
        userId: auth.currentUser.uid,
        type: 'prescription',
        createdAt: serverTimestamp(),
        data: result
      }).catch((e) => handleFirestoreError(e, OperationType.CREATE, `users/${auth.currentUser?.uid}/analyses/${newAnalysisRef.id}`));
    } catch (error) {
      console.error("Failed to save to history", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB limit.");
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError("Please upload a valid image file (PNG, JPG, or JPEG).");
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
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

  const analyzePrescription = async (retryCount = 0, modelIndex = 0): Promise<void> => {
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
                  mimeType: "image/jpeg",
                  data: base64Data,
                },
              },
              {
                text: "Analyze this medical prescription carefully.\nExtract all medicines, including their dosages, strengths, durations, and purposes.\nFor each medicine, accurately identify its active ingredients. Provide 2-3 genuine, medically sound generic or branded alternatives with EXACTLY the same active ingredients. Do not guess active ingredients if unreadable; specify 'Unknown'.\nProvide the output in strict JSON format.",
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
              medicines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    strength: { type: Type.STRING },
                    dosage: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    purpose: { type: Type.STRING },
                    activeIngredients: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    instructions: { type: Type.STRING },
                    alternatives: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          manufacturer: { type: Type.STRING },
                          priceEstimate: { type: Type.STRING },
                          reason: { type: Type.STRING },
                        },
                        required: ["name", "manufacturer", "reason"],
                      },
                    },
                  },
                  required: ["name", "activeIngredients", "alternatives"],
                },
              },
              generalAdvice: { type: Type.STRING },
            },
            required: ["medicines"],
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      setAnalysis(result);
      await saveToHistory(result);
    } catch (err: any) {
      console.error(`Error with model ${currentModel}:`, err);
      
      // Handle 503 (Service Unavailable) or 429 (Rate Limit)
      if ((err.status === 503 || err.status === 429) && retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1500; // Slightly longer delay
        setTimeout(() => analyzePrescription(retryCount + 1, modelIndex), delay);
        return;
      }

      // If one model fails completely, try the fallback model
      if (modelIndex < models.length - 1) {
        console.log(`Switching to fallback model: ${models[modelIndex + 1]}`);
        analyzePrescription(0, modelIndex + 1);
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
      pdf.save(`prescription_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  return (
    <div className="pb-20">
      <main className="max-w-5xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black flex items-center gap-3 text-slate-900 dark:text-white">
            <Pill className="w-8 h-8 text-medical-500" /> Medicine
          </h2>
          {analysis && (
            <button onClick={() => { setImage(null); setAnalysis(null); setError(null); }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 transition">
              <RefreshCw className="w-4 h-4" /> Start New
            </button>
          )}
        </div>

        {isApiKeyMissing && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col md:flex-row items-center gap-4 text-amber-800"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-bold text-lg">Configuration Required</h3>
              <p className="text-sm opacity-90">
                The Gemini API key is missing. If you are deploying to Netlify, please add 
                <code className="mx-1 px-1 bg-amber-100 rounded font-bold">GEMINI_API_KEY</code> 
                 to your environment variables in the Netlify dashboard.
              </p>
            </div>
            <a 
              href="https://ai.google.dev/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors"
            >
              Get API Key
            </a>
          </motion.div>
        )}

        {!analysis && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-medical-50 text-medical-700 rounded-full text-xs font-bold mb-4 border border-medical-100"
            >
              <Zap className="w-3 h-3 fill-current" />
              AI-POWERED ANALYSIS
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">
              Understand Your Prescription Better
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Upload or capture a photo of your doctor's prescription to decode handwriting, 
              understand dosages, and find more affordable generic alternatives.
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Upload & Preview */}
          <div className={cn(
            "space-y-6",
            analysis ? "lg:col-span-4" : "lg:col-span-12 max-w-2xl mx-auto w-full"
          )}>
            <motion.div 
              layout
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              <div className="p-6">
                {!image && !isCameraOpen ? (
                  <div className="space-y-4">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-medical-600 dark:hover:border-medical-500 hover:bg-medical-50 dark:hover:bg-medical-900/20 transition-all group relative overflow-hidden",
                        isUploading && "opacity-50 pointer-events-none"
                      )}
                    >
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-medical-100 dark:group-hover:bg-medical-900/50 transition-colors relative z-10">
                        <Upload className="w-8 h-8 text-slate-400 group-hover:text-medical-600 dark:group-hover:text-medical-400" />
                      </div>
                      
                      {isUploading ? (
                        <div className="text-center relative z-10 w-full max-w-xs">
                          <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Uploading... {uploadProgress}%</p>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div className="bg-medical-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center relative z-10">
                          <p className="text-lg font-semibold text-slate-900 dark:text-white">Click to upload or drag and drop</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">PNG, JPG or JPEG (max. 10MB)</p>
                        </div>
                      )}

                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>

                    <div className="relative flex items-center justify-center py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                      </div>
                      <span className="relative px-4 bg-white dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase tracking-widest">or</span>
                    </div>

                    <button 
                      onClick={startCamera}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                    >
                      <Camera className="w-5 h-5" />
                      Use Device Camera
                    </button>
                  </div>
                ) : isCameraOpen ? (
                  <div className="space-y-4">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-slate-200">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 border-2 border-white/30 m-8 rounded-xl pointer-events-none">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-medical-500"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-medical-500"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-medical-500"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-medical-500"></div>
                      </div>
                      <button 
                        onClick={stopCamera}
                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <button 
                      onClick={capturePhoto}
                      className="w-full py-4 bg-medical-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-medical-700 transition-all shadow-lg shadow-medical-600/20"
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                      Capture Prescription
                    </button>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 group">
                      <img 
                        src={image!} 
                        alt="Prescription" 
                        className="w-full h-full object-contain"
                      />
                      {isAnalyzing && (
                        <motion.div 
                          initial={{ top: "0%" }}
                          animate={{ top: "100%" }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 right-0 h-1 bg-medical-500 shadow-[0_0_15px_rgba(2,132,199,0.8)] z-20"
                        />
                      )}
                      {!analysis && !isAnalyzing && (
                        <button 
                          onClick={() => setImage(null)}
                          className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {!analysis && (
                      <button
                        onClick={() => analyzePrescription()}
                        disabled={isAnalyzing}
                        className="w-full py-4 bg-medical-600 hover:bg-medical-700 disabled:bg-slate-300 text-white rounded-2xl font-bold text-lg shadow-lg shadow-medical-600/20 transition-all flex items-center justify-center gap-2"
                      >
                        {isAnalyzing ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Search className="w-5 h-5" />
                            Analyze Now
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3 text-red-700"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </div>

          {/* Right Column: Analysis Results */}
          <AnimatePresence mode="wait">
            {analysis && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="lg:col-span-8 space-y-6"
              >
                <div className="flex justify-end mb-4">
                  <button 
                    onClick={downloadPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-medical-600 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 dark:hover:bg-medical-700 transition"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                </div>

                <div ref={resultsRef} className="space-y-6 bg-transparent pb-4">
                  {/* Patient Info Summary */}
                  {analysis.patientInfo && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-8"
                    >
                    {analysis.patientInfo.name && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Patient Name</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{analysis.patientInfo.name}</p>
                      </div>
                    )}
                    {analysis.patientInfo.age && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Age</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{analysis.patientInfo.age}</p>
                      </div>
                    )}
                    {analysis.patientInfo.date && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Date</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{analysis.patientInfo.date}</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Medicines List */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 px-2">
                    <Pill className="w-5 h-5 text-medical-600" />
                    Prescribed Medicines
                  </h3>
                  
                  {analysis.medicines.map((med, idx) => (
                    <MedicineCard key={idx} medicine={med} index={idx} />
                  ))}
                </div>

                {analysis.generalAdvice && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-blue-50 border border-blue-100 p-6 rounded-3xl"
                  >
                    <div className="flex items-center gap-2 mb-2 text-blue-800">
                      <Info className="w-5 h-5" />
                      <h4 className="font-bold">Doctor's General Advice</h4>
                    </div>
                    <p className="text-blue-700 leading-relaxed">{analysis.generalAdvice}</p>
                  </motion.div>
                )}

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden"
                >
                  <div className="relative z-10">
                    <h4 className="text-xl font-bold mb-2">Medical Disclaimer</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      This analysis is AI-generated and for informational purposes only. 
                      Handwriting recognition can be imperfect. Always verify with your 
                      doctor or pharmacist before taking any medication or switching to alternatives.
                    </p>
                  </div>
                  <div className="absolute -right-8 -bottom-8 opacity-10">
                    <AlertCircle className="w-48 h-48" />
                  </div>
                </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function MedicineCard({ medicine, index }: { medicine: Medicine; index: number }) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  const getBuyLink = (name: string) => {
    return `https://www.google.com/search?tbm=shop&q=buy+${encodeURIComponent(name)}+online`;
  };

  const generateMedicineImage = async () => {
    setIsGeneratingImg(true);
    setImgError(null);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `A clean, professional, high-quality photograph of a medicine packaging for ${medicine.name} ${medicine.strength}. Isolated on a white background.` }]
        }
      });
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          setGeneratedImg(`data:image/jpeg;base64,${base64EncodeString}`);
          break;
        }
      }
    } catch (err: any) {
      console.error(err);
      setImgError("Failed to generate image.");
    } finally {
      setIsGeneratingImg(false);
    }
  };

  // Helper to parse dosage like "1-0-1" or "1 morning, 1 night"
  const renderDosageVisual = (dosage: string) => {
    const parts = dosage.split(/[- ,/]/).filter(p => !isNaN(Number(p)) && p !== "");
    if (parts.length === 3) {
      return (
        <div className="flex gap-2 mt-2">
          {[
            { label: 'Morning', icon: <Sun className="w-3 h-3" />, val: parts[0] },
            { label: 'Afternoon', icon: <Coffee className="w-3 h-3" />, val: parts[1] },
            { label: 'Night', icon: <Moon className="w-3 h-3" />, val: parts[2] }
          ].map((t, i) => (
            <div key={i} className={cn(
              "flex flex-col items-center p-2 rounded-lg border text-[10px] font-bold min-w-[50px]",
              t.val === '0' ? "bg-slate-50 text-slate-300 border-slate-100" : "bg-medical-50 text-medical-700 border-medical-100"
            )}>
              {t.icon}
              <span className="mt-1">{t.val}</span>
            </div>
          ))}
        </div>
      );
    }
    return <p className="text-sm font-bold text-medical-700 mt-1">{dosage}</p>;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md group"
    >
      {/* Card Header with Accent Bar */}
      <div className="h-2 bg-medical-600 w-full" />
      
      <div className="p-6">
        <div className="flex flex-col lg:flex-row justify-between gap-6 mb-8">
          <div className="flex-1 space-y-3">
            <div className="flex items-center flex-wrap gap-3">
              <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{medicine.name}</h4>
              <span className="px-3 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-full uppercase tracking-widest">
                {medicine.strength}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-4 text-slate-500">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Stethoscope className="w-4 h-4 text-medical-600" />
                <span>{medicine.purpose}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Calendar className="w-4 h-4 text-medical-600" />
                <span>{medicine.duration}</span>
              </div>
            </div>
          </div>
          
          <div className="shrink-0 flex flex-col items-end gap-3">
            <motion.a 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={getBuyLink(medicine.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 w-full"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="font-bold text-sm">Buy Online</span>
            </motion.a>

            <button 
              onClick={generateMedicineImage}
              disabled={isGeneratingImg}
              className="px-6 py-3 bg-medical-50 text-medical-700 rounded-2xl flex items-center justify-center gap-2 hover:bg-medical-100 transition-all shadow-sm border border-medical-200 w-full disabled:opacity-50"
            >
              {isGeneratingImg ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              <span className="font-bold text-sm">
                {isGeneratingImg ? 'Generating image (wait a few seconds)...' : 'View Medicine Image'}
              </span>
            </button>
          </div>
        </div>

        {generatedImg && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center"
          >
            <div className="relative p-4 w-full flex justify-center">
               <img src={generatedImg} alt={medicine.name} className="max-h-64 object-contain rounded-xl shadow-sm" />
               <button 
                 onClick={() => setGeneratedImg(null)}
                 className="absolute top-6 right-6 p-2 bg-white/80 hover:bg-white text-slate-700 rounded-full shadow-sm backdrop-blur-sm"
               >
                 <X className="w-4 h-4" />
               </button>
            </div>
          </motion.div>
        )}
        
        {imgError && (
          <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {imgError}
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4" />
              <p className="text-[10px] uppercase tracking-widest font-black">Dosage Schedule</p>
            </div>
            {renderDosageVisual(medicine.dosage)}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-slate-400">
              <ClipboardList className="w-4 h-4" />
              <p className="text-[10px] uppercase tracking-widest font-black">Instructions</p>
            </div>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">
              {medicine.instructions}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Pill className="w-4 h-4" />
              <p className="text-[10px] uppercase tracking-widest font-black">Composition</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {medicine.activeIngredients.map((ing, i) => (
                <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-bold text-slate-600">
                  {ing}
                </span>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowAlternatives(!showAlternatives)}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-2",
            showAlternatives 
              ? "bg-medical-600 border-medical-600 text-white shadow-lg shadow-medical-600/20" 
              : "bg-white border-slate-200 text-slate-600 hover:border-medical-600 hover:text-medical-600"
          )}
        >
          {showAlternatives ? 'Hide Generic Alternatives' : 'Find Generic Alternatives'}
          <ChevronRight className={cn("w-4 h-4 transition-transform duration-300", showAlternatives && "rotate-90")} />
        </button>

        <AnimatePresence>
          {showAlternatives && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-100" />
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">Suggested Alternatives</p>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {medicine.alternatives.map((alt, aIdx) => (
                    <motion.div 
                      key={aIdx} 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: aIdx * 0.05 }}
                      className="p-5 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-medical-200 hover:shadow-xl hover:shadow-medical-600/5 transition-all group/alt flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-bold text-slate-900 text-lg group-hover/alt:text-medical-600 transition-colors">{alt.name}</h5>
                          <p className="text-xs font-medium text-slate-400">{alt.manufacturer}</p>
                        </div>
                        <div className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-black rounded uppercase tracking-wider">
                          {alt.priceEstimate}
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 text-slate-600 mb-6 bg-white/50 p-3 rounded-xl border border-slate-100 flex-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-medium leading-relaxed">{alt.reason}</p>
                      </div>

                      <motion.a 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        href={getBuyLink(alt.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Buy Now
                      </motion.a>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
