"use client";
import { useState, useEffect } from 'react';
import FileUpload from '@/components/FileUpload';
import QuizEngine, { QuizQuestion } from '@/components/QuizEngine';
import { BookOpen, Clock, Search, Trash2, PlayCircle, Moon, Sun, FileText, Download, ExternalLink, AlertTriangle, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export interface QuizDocument {
  id: string;
  created_at: string;
  last_accessed_at: string;
  title: string;
  keywords: string[];
  questions: QuizQuestion[];
  current_index: number;
  score: number;
  user_answers: Record<number, string>;
  pdf_url?: string; 
  pdf_filename?: string; 
}

export interface StoredDocument {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

export default function Home() {
  const [activeQuiz, setActiveQuiz] = useState<QuizDocument | null>(null);
  const [savedQuizzes, setSavedQuizzes] = useState<QuizDocument[]>([]);
  const [storedDocs, setStoredDocs] = useState<StoredDocument[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [uploadMode, setUploadMode] = useState<'new' | 'existing'>('new');
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
  
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const cached = localStorage.getItem('quiz_cache');
    if (cached) setSavedQuizzes(JSON.parse(cached));

    const fetchData = async () => {
      if (!supabase) return;
      
      const { data: qData } = await supabase.from('quizzes').select('*').order('last_accessed_at', { ascending: false });
      if (qData) {
        setSavedQuizzes(qData);
        localStorage.setItem('quiz_cache', JSON.stringify(qData));
      }

      const { data: dData } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (dData) setStoredDocs(dData);
    };
    fetchData();
  }, []);

  // 1. Upload NEW PDF and Generate
  const handlePdfUpload = async (file: File) => {
    setIsGenerating(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      let uploadedPdfUrl = '';
      const originalFileName = file.name;

      if (supabase) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const fileName = `${Date.now()}-${safeName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage.from('pdfs').upload(fileName, file);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('pdfs').getPublicUrl(fileName);
          uploadedPdfUrl = publicUrl;
          
          const { data: newDoc } = await supabase.from('documents').insert([{
            file_name: originalFileName,
            file_url: uploadedPdfUrl
          }]).select().single();
          
          if (newDoc) setStoredDocs([newDoc, ...storedDocs]);
        }
      }

      const response = await fetch('/api/generate', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');

      if (!supabase) throw new Error("Database not connected");
      const { data: insertedData, error } = await supabase
        .from('quizzes')
        .insert([{
          title: data.quiz.title,
          keywords: data.quiz.keywords,
          questions: data.quiz.questions,
          current_index: 0,
          score: 0,
          user_answers: {},
          pdf_url: uploadedPdfUrl, 
          pdf_filename: originalFileName 
        }]).select().single();

      if (error) throw error;
      const updatedCache = [insertedData, ...savedQuizzes];
      setSavedQuizzes(updatedCache);
      localStorage.setItem('quiz_cache', JSON.stringify(updatedCache));
      
    } catch (error: any) {
      console.error("Upload error:", error);
      // === RATE LIMIT ALERT UI ===
      if (error.message && error.message.includes("Rate limit")) {
        alert("⏳ " + error.message);
      } else {
        alert("❌ Error: " + (error.message || "Something went wrong"));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Generate from EXISTING PDF
  const generateFromExisting = async (doc: StoredDocument) => {
    setIsGenerating(true);
    try {
      const response = await fetch(doc.file_url);
      const blob = await response.blob();
      const file = new File([blob], doc.file_name, { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('pdf', file);

      const apiRes = await fetch('/api/generate', { method: 'POST', body: formData });
      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.error || 'Generation failed');

      const { data: insertedData, error } = await supabase
        .from('quizzes')
        .insert([{
          title: data.quiz.title,
          keywords: data.quiz.keywords,
          questions: data.quiz.questions,
          current_index: 0,
          score: 0,
          user_answers: {},
          pdf_url: doc.file_url,
          pdf_filename: doc.file_name
        }]).select().single();

      if (error) throw error;
      const updatedCache = [insertedData, ...savedQuizzes];
      setSavedQuizzes(updatedCache);
      localStorage.setItem('quiz_cache', JSON.stringify(updatedCache));
      
    } catch (error: any) {
      console.error("Generation error:", error);
      // === RATE LIMIT ALERT UI ===
      if (error.message && error.message.includes("Rate limit")) {
        alert("⏳ " + error.message);
      } else {
        alert("❌ Error: " + (error.message || "Something went wrong"));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const openQuiz = async (quiz: QuizDocument) => {
    setActiveQuiz(quiz);
    const now = new Date().toISOString();
    const updatedQuizzes = savedQuizzes.map(q => q.id === quiz.id ? { ...q, last_accessed_at: now } : q);
    setSavedQuizzes(updatedQuizzes);
    localStorage.setItem('quiz_cache', JSON.stringify(updatedQuizzes));
    if (supabase) await supabase.from('quizzes').update({ last_accessed_at: now }).eq('id', quiz.id);
  };

  const handleProgressSave = async (newIndex: number, newScore: number, answers: Record<number, string>) => {
    if (!activeQuiz) return;
    const targetIndex = newIndex + 1;
    const updatedQuizzes = savedQuizzes.map(q => q.id === activeQuiz.id ? { ...q, current_index: targetIndex, score: newScore, user_answers: answers } : q);
    setSavedQuizzes(updatedQuizzes);
    localStorage.setItem('quiz_cache', JSON.stringify(updatedQuizzes));
    if (supabase) await supabase.from('quizzes').update({ current_index: targetIndex, score: newScore, user_answers: answers }).eq('id', activeQuiz.id);
  };

  const resetQuiz = async (quizId: string) => {
    const updatedQuizzes = savedQuizzes.map(q => q.id === quizId ? { ...q, current_index: 0, score: 0, user_answers: {} } : q);
    setSavedQuizzes(updatedQuizzes);
    localStorage.setItem('quiz_cache', JSON.stringify(updatedQuizzes));
    const resetData = updatedQuizzes.find(q => q.id === quizId);
    if (resetData) setActiveQuiz(resetData);
    if (supabase) await supabase.from('quizzes').update({ current_index: 0, score: 0, user_answers: {} }).eq('id', quizId);
  };

  const initiateDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setQuizToDelete(id);
  };

  const confirmDelete = async () => {
    if (!quizToDelete) return;
    const updatedCache = savedQuizzes.filter(q => q.id !== quizToDelete);
    setSavedQuizzes(updatedCache);
    localStorage.setItem('quiz_cache', JSON.stringify(updatedCache));
    if (supabase) await supabase.from('quizzes').delete().eq('id', quizToDelete);
    setQuizToDelete(null); 
  };

  const filteredQuizzes = savedQuizzes.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <main className="min-h-screen p-6 md:p-12 bg-[#F9FAFB] dark:bg-gray-950 transition-colors flex flex-col items-center relative">
      
      <div className="w-full max-w-5xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveQuiz(null)}>
          <div className="bg-blue-600 dark:bg-blue-500 p-2 rounded-lg">
            <BookOpen className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">REVIEWER NI PAU</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <Link 
            href="/documents"
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
          >
            <FileText className="w-4 h-4" /> Library
          </Link>

          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-gray-300" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
          )}

          {activeQuiz && (
            <button 
              onClick={() => setActiveQuiz(null)}
              className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Exit Quiz
            </button>
          )}
        </div>
      </div>

      {!activeQuiz && !isGenerating && (
        <div className="w-full max-w-5xl space-y-16">
          
          <section className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Generate Assessment</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Upload a new PDF or select from your library.</p>
              </div>
              
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
                <button 
                  onClick={() => setUploadMode('new')}
                  className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${uploadMode === 'new' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  Upload New
                </button>
                <button 
                  onClick={() => setUploadMode('existing')}
                  className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${uploadMode === 'existing' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  Select Existing
                </button>
              </div>
            </div>

            {uploadMode === 'new' ? (
              <FileUpload onUpload={handlePdfUpload} />
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {storedDocs.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                    No previous documents found in your library.
                  </p>
                ) : (
                  storedDocs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-transparent hover:border-blue-300 dark:hover:border-blue-700 transition-all group">
                       <div className="flex items-center gap-3 overflow-hidden">
                         <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                         <span className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate">{doc.file_name}</span>
                       </div>
                       <button 
                         onClick={() => generateFromExisting(doc)} 
                         className="shrink-0 flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
                       >
                         <Plus className="w-3 h-3" /> Generate Quiz
                       </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>

          {savedQuizzes.length > 0 && (
            <section>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" /> Recent Assessments
                </h2>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Search by title..." 
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredQuizzes.map((quiz) => {
                  const progress = Math.round((quiz.current_index / quiz.questions.length) * 100);
                  return (
                    <div 
                      key={quiz.id} 
                      onClick={() => openQuiz(quiz)}
                      className="group relative bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <button 
                        onClick={(e) => initiateDelete(e, quiz.id)}
                        className="absolute top-4 right-4 p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                        title="Delete Assessment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 line-clamp-2 pr-6">{quiz.title}</h3>
                        
                        <div className="flex flex-wrap gap-2 mb-6">
                          {quiz.keywords.slice(0, 3).map((k, i) => (
                            <span key={i} className="text-[10px] font-black uppercase tracking-widest text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">
                              {k}
                            </span>
                          ))}
                        </div>

                        <div className="space-y-2 mb-6">
                          <div className="flex justify-between text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-green-500 dark:bg-green-400' : 'bg-blue-500 dark:bg-blue-400'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-50 dark:border-gray-800/50">
                        {quiz.pdf_url && (
                          <div className="flex flex-col gap-2 mb-3">
                            <div className="flex gap-2">
                              <a 
                                href={quiz.pdf_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()} 
                                className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" /> View
                              </a>
                              <a 
                                href={`${quiz.pdf_url}?download=`} 
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors"
                              >
                                <Download className="w-3 h-3" /> Download
                              </a>
                            </div>
                            
                            {quiz.pdf_filename && (
                              <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 truncate px-2 italic">
                                File: {quiz.pdf_filename}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 font-bold mt-1">
                           <span className="flex items-center gap-1"><PlayCircle className="w-3 h-3" /> Resume Quiz</span>
                           <span>{quiz.questions.length} Qs</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {isGenerating && (
        <div className="fixed inset-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center transition-colors">
           <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6" />
           <h2 className="text-2xl font-black text-gray-900 dark:text-white">Analyzing Document...</h2>
           <p className="text-gray-500 dark:text-gray-400 max-w-xs mt-2">Gemini is writing your NCLEX clinical scenarios and rationales. This takes about 45-60 seconds.</p>
        </div>
      )}

      {activeQuiz && !isGenerating && (
        <div className="w-full max-w-4xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{activeQuiz.title}</h2>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {activeQuiz.keywords.map((k, i) => (
                <span key={i} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800 px-2 py-1 rounded-full uppercase tracking-widest">{k}</span>
              ))}
            </div>
            
            {activeQuiz.pdf_url && (
               <a 
                 href={activeQuiz.pdf_url} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
               >
                 <FileText className="w-4 h-4 text-blue-500" /> 
                 {activeQuiz.pdf_filename ? `Source: ${activeQuiz.pdf_filename}` : 'Source Document'}
               </a>
            )}
          </div>
          
          <QuizEngine 
            quizData={activeQuiz.questions} 
            initialIndex={activeQuiz.current_index}
            initialScore={activeQuiz.score}
            initialAnswers={activeQuiz.user_answers || {}}
            pdfUrl={activeQuiz.pdf_url}
            onProgressSave={handleProgressSave}
            onReset={() => resetQuiz(activeQuiz.id)}
          /> 
        </div>
      )}

      <AnimatePresence>
        {quizToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Delete Assessment?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                This will permanently remove the quiz. Your original source document will remain safe in the library.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setQuizToDelete(null)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-red-600 dark:bg-red-500 text-white rounded-xl font-bold hover:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-lg shadow-red-200 dark:shadow-none"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}