import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Pill, Activity, ArrowRight, ShieldCheck, Zap, Mail, Phone, MapPin } from 'lucide-react';

export default function Dashboard() {
  useEffect(() => {
    document.title = "Dashboard | dawa sathi.ai";
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 pt-12 pb-24 space-y-24">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 md:space-y-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-black tracking-widest uppercase border border-blue-100"
        >
          <Zap className="w-4 h-4 fill-current" />
          Powered by AI ⚡️
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]"
        >
          Decode Your Health <br className="hidden md:block"/> With Confidence 🏥
        </motion.h1>

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-medium"
        >
          dawa sathi.ai uses advanced AI to instantly translate complex medical prescriptions and lab reports into simple, actionable insights. 🧠✨
        </motion.p>
      </section>

      {/* Main Options */}
      <section className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
        <motion.div
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Link to="/prescription" className="block h-full relative group">
            <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-[2rem] transform translate-y-2 translate-x-2 group-hover:translate-y-4 group-hover:translate-x-4 transition-transform duration-300 hidden md:block" />
            <div className="relative h-full bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2rem] border-2 border-slate-900 dark:border-slate-700 flex flex-col items-start hover:-translate-y-2 hover:-translate-x-2 transition-transform duration-300">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mb-6 md:mb-8 border border-blue-200 dark:border-blue-800">
                <Pill className="w-7 h-7 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-3 md:mb-4">Medicine 💊</h2>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 font-medium mb-6 md:mb-8 flex-1">
                Upload your doctor's handwritten prescription. Get instant details on dosages, purposes, and find cheaper generic alternatives online.
              </p>
              <div className="mt-auto flex items-center gap-2 font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Start Scanning <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Link to="/lab-report" className="block h-full relative group">
            <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-[2rem] transform translate-y-2 -translate-x-2 group-hover:translate-y-4 group-hover:-translate-x-4 transition-transform duration-300 hidden md:block" />
            <div className="relative h-full bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2rem] border-2 border-slate-900 dark:border-slate-700 flex flex-col items-start hover:-translate-y-2 hover:translate-x-2 transition-transform duration-300">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center mb-6 md:mb-8 border border-emerald-200 dark:border-emerald-800">
                <Activity className="w-7 h-7 md:w-8 md:h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-3 md:mb-4">Lab Reports 🔬</h2>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 font-medium mb-6 md:mb-8 flex-1">
                Upload blood work or lab results. Understand the positive and negative indicators, potential risks, and know exactly which specialist to consult.
              </p>
              <div className="mt-auto flex items-center gap-2 font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Analyze Report <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Link>
        </motion.div>
      </section>

      {/* About & Trust */}
      <section className="bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] text-white p-8 md:p-20 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <ShieldCheck className="w-64 h-64" />
        </div>
        <div className="relative z-10 grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h3 className="text-4xl font-black">Why dawa sathi.ai? 🛡️</h3>
            <p className="text-lg text-slate-400 font-medium leading-relaxed">
              Medical jargon is confusing. We believe everyone deserves to completely understand their health. 
              By leveraging advanced AI, we break down complex terms into simple, understandable language, 
              empowering you to make informed decisions and ask your doctor the right questions.
            </p>
            <ul className="space-y-4 pt-4">
              <li className="flex items-center gap-3 font-bold">
                <CheckCircle2 className="w-6 h-6 text-medical-500" /> Private & Secure
              </li>
              <li className="flex items-center gap-3 font-bold">
                <CheckCircle2 className="w-6 h-6 text-medical-500" /> Instant Results
              </li>
              <li className="flex items-center gap-3 font-bold">
                <CheckCircle2 className="w-6 h-6 text-medical-500" /> Saving you Money
              </li>
            </ul>
          </div>
          <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-sm border border-white/20">
            <h4 className="text-2xl font-bold mb-6">Contact Us 📬</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-medical-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Email</p>
                  <p className="font-medium">support@dawasathi.ai</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-medical-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Phone</p>
                  <p className="font-medium">+1 (800) 123-4567</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-medical-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Office</p>
                  <p className="font-medium">123 Health Tech Blvd, SF, CA</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CheckCircle2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
  );
}
