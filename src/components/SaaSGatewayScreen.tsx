import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LOGO_BASE64 } from '../data/logo';
import { 
  BookOpen, 
  Download, 
  Monitor, 
  Sparkles, 
  Check, 
  ArrowRight, 
  Star, 
  Quote, 
  Mail, 
  User as UserIcon, 
  Shield, 
  CheckCircle2,
  Tv,
  Users
} from 'lucide-react';

export const SaaSGatewayScreen: React.FC = () => {
  const { login, signUp, loginAsGuest } = useApp();
  
  // Tab states for auth
  const [authMode, setAuthMode] = useState<'none' | 'login' | 'signup'>('none');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedTier, setSelectedTier] = useState<'free' | 'individual-pro' | 'parish-license'>('individual-pro');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Local signup mock persistence notifier
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!email || !fullName) {
      setAuthError('Please fill in all details.');
      return;
    }

    const completed = signUp(email, fullName, selectedTier);
    if (completed) {
      setAuthSuccess('Registration successful! Welcome to the Sanctuary.');
      setTimeout(() => {
        setAuthMode('none');
      }, 1000);
    } else {
      setAuthError('This email is already registered. Try logging in instead.');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!email) {
      setAuthError('Please enter your email.');
      return;
    }

    const completed = login(email);
    if (completed) {
      setAuthSuccess('Welcome back!');
      setTimeout(() => {
        setAuthMode('none');
      }, 1000);
    } else {
      setAuthError('Email not found. Please click Sign Up to register this email account first.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#111111] text-[#111111] dark:text-gray-100 font-sans selection:bg-[#E53935]/10 overflow-x-hidden">
      {/* SaaS Promotional Header */}
      <header className="w-full h-20 border-b border-gray-100 dark:border-zinc-800 bg-white/85 dark:bg-[#111111]/85 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto h-full px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={LOGO_BASE64} 
              alt="Hymn Book Logo" 
              className="w-9 h-9 object-contain"
            />
            <span className="font-bold tracking-tight text-base sm:text-lg hidden sm:inline-block">
              Methodist <span className="text-[#E53935]">Hymn Book</span>
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <a href="#features" className="text-xs font-bold text-[#757575] hover:text-[#111111] dark:text-zinc-400 dark:hover:text-white uppercase tracking-widest transition-colors hidden md:inline-block">
              Features
            </a>
            <a href="#pricing" className="text-xs font-bold text-[#757575] hover:text-[#111111] dark:text-zinc-400 dark:hover:text-white uppercase tracking-widest transition-colors hidden md:inline-block">
              Pricing
            </a>
            <a href="#testimonials" className="text-xs font-bold text-[#757575] hover:text-[#111111] dark:text-zinc-400 dark:hover:text-white uppercase tracking-widest transition-colors hidden md:inline-block">
              Testimonials
            </a>
            
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
              className="text-xs font-bold uppercase tracking-wider text-[#757575] hover:text-[#111111] dark:text-zinc-300 dark:hover:text-white px-3 py-2 cursor-pointer transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }}
              className="h-10 bg-[#E53935] hover:bg-red-600 text-white font-bold text-xs uppercase tracking-widest px-4 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-5 py-12 md:py-24 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-950/20 px-4 py-1.5 rounded-full border border-red-100/30">
          <Sparkles size={14} className="text-[#E53935]" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E53935]">
            Enterprise SaaS Mobile Devotional
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[#111111] dark:text-white max-w-4xl mx-auto leading-tight">
          The Sacred Methodist Hymnal. <br />
          <span className="bg-gradient-to-r from-[#E53935] via-red-500 to-amber-500 bg-clip-text text-transparent">
            Reimagined for the Digital Era.
          </span>
        </h1>

        <p className="text-[#757575] dark:text-zinc-400 text-sm md:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
          Elevate church worship and daily prayers with offline-ready access to MHB, Xhosa, Setswana, and Sesotho books. Equipped with High-Contrast Projection Mode and secure device synchronization.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }}
            className="w-full sm:w-auto h-14 px-8 bg-[#E53935] hover:bg-red-600 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all hover:shadow-[#E53935]/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            Access Free Digital Book
            <ArrowRight size={16} />
          </button>
          
          <button
            onClick={loginAsGuest}
            className="w-full sm:w-auto h-14 px-8 bg-white dark:bg-zinc-900 text-[#111111] dark:text-white border border-gray-100 dark:border-zinc-800 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-850 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            Enter as a guest
          </button>
        </div>

        <div className="text-xs text-[#757575] dark:text-zinc-500 pt-1 flex items-center justify-center gap-2">
          <span>✔️ Complete Offline Capability</span>
          <span>•</span>
          <span>✔️ Easy Bookmark Synchronization</span>
          <span>•</span>
          <span>✔️ Pure Ad-Free Worship</span>
        </div>

        {/* Hero App Mockup Preview */}
        <div className="pt-8 md:pt-12 max-w-4xl mx-auto">
          <div className="bg-white dark:bg-zinc-950 p-4 sm:p-6 rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800/80 hover:border-red-500/10 transition-all duration-300">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-900 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3   h-3 rounded-full bg-red-400"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="w-3 h-3 rounded-full bg-green-400"></span>
              </div>
              <div className="text-[10px] font-mono font-bold text-[#757575] uppercase tracking-widest bg-gray-50 dark:bg-zinc-900 px-4 py-1 rounded-full">
                mhb-web-pwa.app
              </div>
              <div className="w-8"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="bg-[#FAFAFA] dark:bg-zinc-900/50 p-5 rounded-2xl border border-gray-50 dark:border-zinc-805/40">
                <div className="w-9 h-9 rounded-xl bg-red-50/50 dark:bg-red-950/20 text-[#E53935] flex items-center justify-center mb-4">
                  <BookOpen size={16} />
                </div>
                <h3 className="font-bold text-sm text-[#111111] dark:text-white uppercase mb-1.5 tracking-wider">Hymn Sanctuary</h3>
                <p className="text-xs text-[#757575] dark:text-zinc-400 leading-normal">
                  Toggle easily between MHB English, Amadodana Xhosa, and Sotho collections with a beautiful integrated reader.
                </p>
              </div>

              <div className="bg-[#FAFAFA] dark:bg-zinc-900/50 p-5 rounded-2xl border border-gray-50 dark:border-zinc-805/40">
                <div className="w-9 h-9 rounded-xl bg-red-50/50 dark:bg-red-950/20 text-[#E53935] flex items-center justify-center mb-4">
                  <Download size={16} />
                </div>
                <h3 className="font-bold text-sm text-[#111111] dark:text-white uppercase mb-1.5 tracking-wider">Offline caching</h3>
                <p className="text-xs text-[#757575] dark:text-zinc-400 leading-normal">
                  Pre-download books onto your phone's memory. Fully operational during blackouts, offline journeys, or chapel services.
                </p>
              </div>

              <div className="bg-[#FAFAFA] dark:bg-zinc-900/50 p-5 rounded-2xl border border-gray-50 dark:border-zinc-805/40">
                <div className="w-9 h-9 rounded-xl bg-red-50/50 dark:bg-red-950/20 text-[#E53935] flex items-center justify-center mb-4">
                  <Monitor size={16} />
                </div>
                <h3 className="font-bold text-sm text-[#111111] dark:text-white uppercase mb-1.5 tracking-wider">Projection mode</h3>
                <p className="text-xs text-[#757575] dark:text-zinc-400 leading-normal">
                  Activate high-contrast visual display. Designed to project hymn texts onto walls or ceiling screens effortlessly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Spotlight Section */}
      <section id="features" className="bg-white dark:bg-[#151515] py-16 md:py-24 border-y border-gray-100 dark:border-zinc-850">
        <div className="max-w-5xl mx-auto px-5 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[#E53935] uppercase tracking-widest text-xs font-bold block">
              CHURCH PREFERENCES
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              SaaS Solutions for Modern Congregations
            </h2>
            <p className="text-[#757575] dark:text-zinc-400 text-sm">
              We provide specific feature configurations customized for individual devotionals and broad multi-site parish administration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50/50 dark:bg-red-950/20 text-[#E53935] flex items-center justify-center shrink-0">
                <Tv size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[#111111] dark:text-white">Sanctuary Projection Sync</h3>
                <p className="text-xs text-[#757575] dark:text-zinc-400 leading-relaxed">
                  Connect multiple devices to a master projector. As the lead liturgist turns the hymn page, congregation projection screens trigger instantaneous updates.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50/50 dark:bg-red-950/20 text-[#E53935] flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[#111111] dark:text-white">Parish Bulletin Publisher</h3>
                <p className="text-xs text-[#757575] dark:text-zinc-400 leading-relaxed">
                  Design services bulletins, and export customized PDF layouts with hymn verses and devotional readings prepared for direct bulletin printout.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50/50 dark:bg-red-950/20 text-[#E53935] flex items-center justify-center shrink-0">
                <Download size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[#111111] dark:text-white">Broad Offline Sync Manager</h3>
                <p className="text-xs text-[#757575] dark:text-zinc-400 leading-relaxed">
                  Deploy cached storage profiles for entire regions. Once synced, zero bandwidth is required to operate the entire church's musical repository indefinitely.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50/50 dark:bg-red-950/20 text-[#E53935] flex items-center justify-center shrink-0">
                <Shield size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[#111111] dark:text-white">Secure Data Vault</h3>
                <p className="text-xs text-[#757575] dark:text-zinc-400 leading-relaxed">
                  All saved favorite lyrics and custom prayers are safely persisted across local storage directories. Adherence to GDPR and localized protection frameworks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Subscriptions Section */}
      <section id="pricing" className="py-16 md:py-24 max-w-5xl mx-auto px-5 space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-[#E53935] uppercase tracking-widest text-xs font-bold block">
            SUBSCRIPTION LICENSES
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Transparent Pricing For All Devotionals
          </h2>
          <p className="text-[#757575] dark:text-zinc-400 text-sm">
            Whether a daily quiet worshipper or a multi-parish church, select the perfect license plan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
          {/* Free Tier */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-gray-100 dark:border-zinc-800 flex flex-col justify-between space-y-6 relative hover:shadow-lg transition-all">
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#757575] bg-gray-150/50 dark:bg-zinc-800 px-3 py-1 rounded-full inline-block">
                Free
              </span>
              <h3 className="text-lg font-bold">Worshipper Guest</h3>
              <p className="text-xs text-[#757575] dark:text-zinc-400">
                Ideal for simple digital book access or travelers looking for immediate service backup.
              </p>
              <div className="pt-2">
                <span className="text-3xl font-extrabold">R0</span>
                <span className="text-xs text-[#757575] font-semibold"> / Forever</span>
              </div>
              <hr className="border-gray-100 dark:border-zinc-800" />
              <ul className="space-y-3 text-xs">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#E53935] shrink-0" />
                  <span>Access Standard English MHB</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#E53935] shrink-0" />
                  <span>Access Liturgy Prayers</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#E53935] shrink-0" />
                  <span>Default FontSize Adjustments</span>
                </li>
                <li className="flex items-center gap-2 text-zinc-400 dark:text-zinc-605 line-through">
                  <span>Full Offline Multi-Book Downloader</span>
                </li>
              </ul>
            </div>
            <button
              onClick={loginAsGuest}
              className="w-full h-11 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-750 text-[#111111] dark:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Start Free Guest Account
            </button>
          </div>

          {/* Individual Pro Tier */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border-2 border-[#E53935] flex flex-col justify-between space-y-6 relative hover:shadow-xl transition-all shadow-md">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#E53935] text-white text-[9px] uppercase tracking-widest font-extrabold px-3 py-1 rounded-full">
              Most Popular
            </div>
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E53935] bg-red-50/50 dark:bg-red-950/20 px-3 py-1 rounded-full inline-block">
                Individual Pro
              </span>
              <h3 className="text-lg font-bold">Devotional Pro</h3>
              <p className="text-xs text-[#757575] dark:text-zinc-400">
                Advanced typography preferences, cloud backup bookmarks, and unlimited cache.
              </p>
              <div className="pt-2">
                <span className="text-3xl font-extrabold">R49</span>
                <span className="text-xs text-[#757575] font-semibold"> / mo</span>
              </div>
              <hr className="border-gray-100 dark:border-zinc-800" />
              <ul className="space-y-3 text-xs">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#E53935] shrink-0" />
                  <span className="font-semibold">Unlimited Multi-Language Downloads</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#E53935] shrink-0" />
                  <span>Full Offline Audio Playable Melodies</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#E53935] shrink-0" />
                  <span>Interactive High-Contrast Theme Specs</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#E53935] shrink-0" />
                  <span>Personal Bookmark Collections Cloud Sync</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => { setSelectedTier('individual-pro'); setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }}
              className="w-full h-11 bg-[#E53935] hover:bg-red-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Get Devotional Pro
            </button>
          </div>

          {/* Parish license Tier */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-gray-100 dark:border-zinc-800 flex flex-col justify-between space-y-6 relative hover:shadow-lg transition-all">
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-1 rounded-full inline-block">
                Parish License
              </span>
              <h3 className="text-lg font-bold">Parish / Church</h3>
              <p className="text-xs text-[#757575] dark:text-zinc-400">
                Fully licenses any congregation size for digital board projection and unified bulletins.
              </p>
              <div className="pt-2">
                <span className="text-3xl font-extrabold">R299</span>
                <span className="text-xs text-[#757575] font-semibold"> / mo</span>
              </div>
              <hr className="border-gray-100 dark:border-zinc-800" />
              <ul className="space-y-3 text-xs">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#E53935] shrink-0" />
                  <span className="font-semibold">Sanctuary Projection Sync Support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#E53935] shrink-0" />
                  <span>Service Bulletin Creator &amp; Custom PDFs</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#E53935] shrink-0" />
                  <span>Infinite Congregation Devices Licenses</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#E53935] shrink-0" />
                  <span>Priority Local Circuit Dedicated Support</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => { setSelectedTier('parish-license'); setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }}
              className="w-full h-11 bg-gray-900 dark:bg-zinc-805 hover:bg-black dark:hover:bg-zinc-750 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer"
            >
              Purchase Parish License
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="bg-[#FAFAFA] dark:bg-zinc-950/40 py-16 md:py-24 border-t border-gray-100 dark:border-zinc-850">
        <div className="max-w-5xl mx-auto px-5 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[#E53935] uppercase tracking-widest text-xs font-bold block">
              SANCTUARY ENDORSEMENTS
            </span>
            <h2 className="text-3xl font-bold tracking-tight">
              Testimonials From Local Circuits
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-6 rounded-2xl space-y-4">
              <div className="flex gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-current" />)}
              </div>
              <p className="text-xs text-[#757575] dark:text-zinc-300 italic leading-relaxed">
                "Finding Setswana and English MHB verses synchronized instantly inside the same interface is an absolute gift. The projection contrast is marvelous for evening church services."
              </p>
              <div>
                <h4 className="font-bold text-xs">Rev. S. Baloyi</h4>
                <p className="text-[10px] text-[#757575]">Methodist Church of Southern Africa</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-6 rounded-2xl space-y-4">
              <div className="flex gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-current" />)}
              </div>
              <p className="text-xs text-[#757575] dark:text-zinc-300 italic leading-relaxed">
                "Our choir has been using the offline PWA book during regional meetings where network reception is completely unavailable. Beautifully clean and responsive interface."
              </p>
              <div>
                <h4 className="font-bold text-xs">Sister Gloria M.</h4>
                <p className="text-[10px] text-[#757575]">Regional Liturgy Choir Director</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-6 rounded-2xl space-y-4 md:col-span-2 lg:col-span-1">
              <div className="flex gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-current" />)}
              </div>
              <p className="text-xs text-[#757575] dark:text-zinc-300 italic leading-relaxed">
                "The Parish license has helped us cut bulletin printing costs significantly. The congregation scans a barcode, logs in as a guest, and receives exact lyrics immediately."
              </p>
              <div>
                <h4 className="font-bold text-xs">Pastor Timothy W.</h4>
                <p className="text-[10px] text-[#757575]">Wesley Methodist Parish Supervisor</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Auth modal overlay */}
      {authMode !== 'none' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 w-full max-w-md rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative animate-scale-up">
            {/* Close button */}
            <button
              onClick={() => setAuthMode('none')}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 dark:hover:text-white text-lg font-bold w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
            >
              ×
            </button>

            {/* Header */}
            <div className="text-center space-y-2">
              <img src={LOGO_BASE64} alt="Logo" className="w-12 h-12 mx-auto object-contain" />
              <h3 className="text-xl font-bold tracking-tight">
                {authMode === 'login' ? 'Sign In' : 'Create Free Account'}
              </h3>
              <p className="text-xs text-[#757575] dark:text-zinc-400">
                {authMode === 'login' 
                  ? 'Access your saved favorites and synchronized offline settings.' 
                  : 'Get standard access to Methodist hymnals instantly.'}
              </p>
            </div>

            {/* Notifications */}
            {authError && (
              <div className="p-3 bg-red-50 text-[#E53935] border border-red-100 rounded-xl text-xs font-semibold leading-relaxed">
                ⚠️ {authError}
              </div>
            )}
            {authSuccess && (
              <div className="p-3 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-2">
                <CheckCircle2 size={16} /> {authSuccess}
              </div>
            )}

            {/* Forms */}
            {authMode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#757575]">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. pastor@methodist.org"
                      className="w-full h-11 pl-10 pr-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-[#E53935] outline-none"
                    />
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  <span className="text-[10px] text-[#757575] leading-normal block italic">
                    Tip: If not registered yet, click "Create Account" below first.
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full h-11 bg-[#E53935] hover:bg-red-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Enter Sanctuary
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-[#757575]">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }}
                      className="text-[#E53935] font-bold hover:underline"
                    >
                      Create Account
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#757575]">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Reverend Timothy"
                      className="w-full h-11 pl-10 pr-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-[#E53935] outline-none"
                    />
                    <UserIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#757575]">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. pastor@methodist.org"
                      className="w-full h-11 pl-10 pr-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-[#E53935] outline-none"
                    />
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#757575]">
                    Subscription Plan Selection
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTier('free')}
                      className={`h-12 text-[10px] uppercase font-bold tracking-wider rounded-xl border transition-all ${
                        selectedTier === 'free'
                          ? 'border-[#E53935] bg-red-50/50 dark:bg-red-950/20 text-[#E53935]'
                          : 'border-gray-100 dark:border-zinc-800 hover:bg-gray-50'
                      }`}
                    >
                      Free
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTier('individual-pro')}
                      className={`h-12 text-[10px] uppercase font-bold tracking-wider rounded-xl border transition-all ${
                        selectedTier === 'individual-pro'
                          ? 'border-[#E53935] bg-red-50/50 dark:bg-red-950/20 text-[#E53935]'
                          : 'border-gray-100 dark:border-zinc-800 hover:bg-gray-50'
                      }`}
                    >
                      Pro
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTier('parish-license')}
                      className={`h-12 text-[10px] uppercase font-bold tracking-wider rounded-xl border transition-all ${
                        selectedTier === 'parish-license'
                          ? 'border-[#E53935] bg-red-50/50 dark:bg-red-950/20 text-[#E53935]'
                          : 'border-gray-100 dark:border-zinc-800 hover:bg-gray-50'
                      }`}
                    >
                      Parish
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-11 bg-[#E53935] hover:bg-red-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Create Account
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-[#757575]">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                      className="text-[#E53935] font-bold hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* Separator */}
            <div className="flex items-center gap-3">
              <hr className="flex-1 border-gray-100 dark:border-zinc-800" />
              <span className="text-[10px] font-bold text-[#757575] uppercase tracking-widest">or</span>
              <hr className="flex-1 border-gray-100 dark:border-zinc-800" />
            </div>

            {/* Guest Action */}
            <button
              onClick={() => {
                loginAsGuest();
                setAuthMode('none');
              }}
              className="w-full h-11 bg-[#FAFAFA] dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-750 text-[#111111] dark:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Continue Immediately as Guest ⛪
            </button>
          </div>
        </div>
      )}

      {/* Footer banner */}
      <footer className="w-full py-12 bg-white dark:bg-[#111111] border-t border-gray-100 dark:border-zinc-800 mt-20 text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <img src={LOGO_BASE64} alt="Hymn Book Logo" className="w-8 h-8 object-contain" />
          <span className="font-extrabold tracking-tight text-sm uppercase">
            Methodist <span className="text-[#E53935]">Hymn Book</span> App
          </span>
        </div>
        <p className="text-xs text-[#757575] max-w-md mx-auto leading-normal px-5">
          Dedicated to the glory of God and the preservation of Wesleyan liturgical music. Available as a cross-platform progressive web application.
        </p>
        <div className="text-[10px] text-[#757575] dark:text-zinc-500">
          © {new Date().getFullYear()} Methodist Hymn Book App • Built for offline sanctuary services • PWA Enterprise edition.
        </div>
      </footer>
    </div>
  );
};
