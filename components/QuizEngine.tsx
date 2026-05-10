import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, RotateCcw, Home, Sparkles, Lightbulb, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface QuizEngineProps {
  quizData: QuizQuestion[];
  initialIndex?: number;
  initialScore?: number;
  initialAnswers?: Record<number, string>;
  pdfUrl?: string; // NEW: Accept the PDF URL
  onProgressSave?: (newIndex: number, newScore: number, answers: Record<number, string>) => void;
  onReset?: () => void;
}

export default function QuizEngine({ 
  quizData, 
  initialIndex = 0, 
  initialScore = 0, 
  initialAnswers = {},
  pdfUrl, // NEW: Extract it from props
  onProgressSave,
  onReset
}: QuizEngineProps) {
  
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [score, setScore] = useState<number>(initialScore);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>(initialAnswers);

  if (currentIndex >= quizData.length) {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-2xl mx-auto p-10 bg-white dark:bg-gray-900 rounded-2xl shadow-xl text-center border border-gray-100 dark:border-gray-800 transition-colors"
      >
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-full">
            <CheckCircle className="w-16 h-16 text-green-500 dark:text-green-400" />
          </div>
        </div>
        <h2 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">Quiz Complete!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Great job finishing the assessment.</p>
        
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 mb-8 flex justify-around items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Final Score</p>
            <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{score} / {quizData.length}</p>
          </div>
          <div className="h-12 w-px bg-gray-200 dark:bg-gray-700"></div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Accuracy</p>
            <p className="text-4xl font-black text-gray-800 dark:text-white">
              {Math.round((score / quizData.length) * 100)}%
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <Home className="w-5 h-5" /> Dashboard
          </button>
          <button 
            onClick={onReset}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-700 dark:hover:bg-blue-600 shadow-lg shadow-blue-200 dark:shadow-none transition-all"
          >
            <RotateCcw className="w-5 h-5" /> Retake Quiz
          </button>
        </div>
      </motion.div>
    );
  }

  const currentQuestion = quizData[currentIndex];
  const savedAnswer = userAnswers[currentIndex];

  const handleAnswerSelect = (option: string) => {
    if (savedAnswer) return;

    const isCorrect = option === currentQuestion.correctAnswer;
    const newScore = isCorrect ? score + 1 : score;
    const newAnswers = { ...userAnswers, [currentIndex]: option };
    
    setUserAnswers(newAnswers);
    setScore(newScore);

    if (onProgressSave) {
      onProgressSave(currentIndex, newScore, newAnswers);
    }
  };

  const goToNext = () => currentIndex < quizData.length && setCurrentIndex(prev => prev + 1);
  const goToPrevious = () => currentIndex > 0 && setCurrentIndex(prev => prev - 1);

  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-0">
      
      {/* HEADER WITH PROGRESS & NEW PDF LINK */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              Progress
            </span>
            
            {/* NEW: Source PDF Link inside the active quiz */}
            {pdfUrl && (
              <a 
                href={pdfUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 px-2 py-1 rounded-md transition-colors"
                title="Open Source PDF in new tab"
              >
                <FileText className="w-3 h-3" /> View Source
              </a>
            )}
          </div>

          <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
            {currentIndex + 1} of {quizData.length}
          </span>
        </div>
        <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-blue-600 dark:bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / quizData.length) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-gray-900 p-6 md:p-10 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 transition-colors"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-gray-800 dark:text-gray-100 leading-tight">
            {currentQuestion.question}
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {currentQuestion.options.map((option, index) => {
              let buttonStyle = "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-gray-800";
              
              if (savedAnswer) {
                if (option === currentQuestion.correctAnswer) {
                  buttonStyle = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-500";
                } else if (option === savedAnswer) {
                  buttonStyle = "bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-800 dark:text-orange-300 shadow-sm ring-1 ring-orange-500";
                } else {
                  buttonStyle = "opacity-40 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-not-allowed grayscale";
                }
              }

              return (
                <motion.button
                  whileHover={!savedAnswer ? { scale: 1.01, x: 5 } : {}}
                  whileTap={!savedAnswer ? { scale: 0.99 } : {}}
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={!!savedAnswer}
                  className={`w-full p-5 border-2 rounded-2xl text-left font-semibold transition-all duration-200 flex justify-between items-center ${buttonStyle}`}
                >
                  <span>{option}</span>
                  {savedAnswer && option === currentQuestion.correctAnswer && <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                  {savedAnswer && option === savedAnswer && option !== currentQuestion.correctAnswer && <XCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {savedAnswer && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className={`p-6 rounded-2xl border-2 shadow-inner ${
                  savedAnswer === currentQuestion.correctAnswer 
                    ? 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800/50' 
                    : 'bg-gradient-to-br from-amber-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/20 border-orange-200 dark:border-orange-800/50'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {savedAnswer === currentQuestion.correctAnswer ? (
                      <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                    ) : (
                      <Lightbulb className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    )}
                    <h4 className={`font-black uppercase text-xs tracking-widest ${
                      savedAnswer === currentQuestion.correctAnswer ? 'text-emerald-800 dark:text-emerald-300' : 'text-orange-800 dark:text-orange-300'
                    }`}>
                      {savedAnswer === currentQuestion.correctAnswer ? 'Spot on!' : 'Key Insight'}
                    </h4>
                  </div>
                  
                  <div className={`text-base md:text-lg font-medium leading-relaxed ${
                    savedAnswer === currentQuestion.correctAnswer ? 'text-emerald-950 dark:text-emerald-100' : 'text-orange-950 dark:text-orange-100'
                  }`}>
                    <ReactMarkdown
                      components={{
                        strong: ({node, ...props}) => <strong className="font-black opacity-100" {...props}/>,
                        em: ({node, ...props}) => <em className="italic opacity-90" {...props}/>
                      }}
                    >
                      {currentQuestion.explanation}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className={`group flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                currentIndex === 0 ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${currentIndex !== 0 && 'group-hover:-translate-x-1'}`} /> 
              Back
            </button>

            {savedAnswer && (
               <button 
                onClick={goToNext}
                className="group flex items-center gap-2 px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:bg-black dark:hover:bg-gray-100 transition-all active:scale-95"
              >
                {currentIndex < quizData.length - 1 ? 'Continue' : 'Show Results'} 
                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}