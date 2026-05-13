"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, Download, ExternalLink, Search, Calendar, Moon, Sun, Trash2, Star, AlertTriangle } from 'lucide-react';

interface DocumentItem {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
  is_favorite?: boolean; // NEW: Added favorite flag
}

export default function DocumentLibrary() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // NEW: State for the delete modal
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setDocuments(data as DocumentItem[]);
      } else {
        console.error("Error fetching documents:", error);
      }
      setIsLoading(false);
    };

    fetchDocuments();
  }, []);

  // NEW: Toggle Favorite Status
  const toggleFavorite = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Optimistic UI Update (feels instant to the user)
    setDocuments(prevDocs => 
      prevDocs.map(doc => doc.id === id ? { ...doc, is_favorite: newStatus } : doc)
    );

    // Background Database Update
    if (supabase) {
      await supabase.from('documents').update({ is_favorite: newStatus }).eq('id', id);
    }
  };

  // NEW: Confirm Delete Function
  const confirmDelete = async () => {
    if (!docToDelete || !supabase) return;
    
    // Remove from UI
    setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docToDelete.id));
    
    // Remove from Database
    await supabase.from('documents').delete().eq('id', docToDelete.id);
    
    setDocToDelete(null); // Close modal
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  // 1. Sort documents: Favorites first, then by date
  const sortedDocs = [...documents].sort((a, b) => {
    if (a.is_favorite === b.is_favorite) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return a.is_favorite ? -1 : 1;
  });

  // 2. Filter by search query
  const filteredDocs = sortedDocs.filter(doc => 
    doc.file_name && doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen p-6 md:p-12 bg-[#F9FAFB] dark:bg-gray-950 transition-colors flex flex-col items-center relative">
      
      {/* Navbar Area */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-12">
        <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="bg-gray-200 dark:bg-gray-800 p-2 rounded-lg">
            <ArrowLeft className="text-gray-700 dark:text-gray-300 w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Back to Dashboard</h1>
        </Link>
        
        <div className="flex items-center gap-4">
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-gray-300" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
          )}
        </div>
      </div>

      <div className="w-full max-w-5xl space-y-8">
        
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-500" /> 
              Document Library
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Manage, favorite, and organize your source materials.</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by filename..." 
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Loading documents...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredDocs.length === 0 && (
          <div className="bg-white dark:bg-gray-900 p-12 rounded-3xl border border-gray-100 dark:border-gray-800 text-center">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No documents found</h3>
            <p className="text-gray-500 dark:text-gray-400">Upload a new PDF on the dashboard to add it to your library.</p>
          </div>
        )}

        {/* Document List */}
        {!isLoading && filteredDocs.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {filteredDocs.map((doc) => (
              <div 
                key={doc.id} 
                className="group flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm relative overflow-hidden"
              >
                
                {/* Visual indicator for favorites on the left edge */}
                {doc.is_favorite && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-400 dark:bg-yellow-500 rounded-l-2xl" />
                )}

                <div className="flex items-start gap-4 flex-1 overflow-hidden pl-2">
                  {/* Favorite Toggle Button */}
                  <button 
                    onClick={() => toggleFavorite(doc.id, !!doc.is_favorite)}
                    className="p-3 shrink-0 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={doc.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Star 
                      className={`w-6 h-6 transition-colors ${
                        doc.is_favorite 
                          ? 'text-yellow-400 dark:text-yellow-500 fill-current' 
                          : 'text-gray-300 dark:text-gray-600'
                      }`} 
                    />
                  </button>
                  
                  <div className="min-w-0 flex-1 pt-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate" title={doc.file_name}>
                      {doc.file_name || "Unnamed Document.pdf"}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                      <span className="flex items-center gap-1 text-xs font-bold text-gray-400 dark:text-gray-500">
                        <Calendar className="w-3 h-3" /> Uploaded {formatDate(doc.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-gray-100 dark:border-gray-800 md:border-t-0 shrink-0">
                  <a 
                    href={doc.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> View
                  </a>
                  <a 
                    href={`${doc.file_url}?download=`} 
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-gray-100 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                  
                  {/* Delete Button */}
                  <button 
                    onClick={() => setDocToDelete(doc)}
                    className="flex items-center justify-center p-2.5 ml-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                    title="Delete Document"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Animated Delete Modal */}
      <AnimatePresence>
        {docToDelete && (
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
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Delete Document?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">
                Are you sure you want to remove <span className="font-bold text-gray-700 dark:text-gray-300">"{docToDelete.file_name}"</span>?
              </p>
              <p className="text-xs text-red-500 dark:text-red-400 mb-8">
                This will remove it from your library forever.
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDocToDelete(null)}
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