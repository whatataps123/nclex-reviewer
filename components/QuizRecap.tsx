import React, { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { QuizQuestion } from './QuizEngine';

interface QuizRecapProps {
  questions: QuizQuestion[];
  userAnswers: Record<number, string>;
}

// Encapsulated sub-component handling its own local state (OOP: Encapsulation)
const RecapItem = ({ question, userAnswer, index }: { question: QuizQuestion, userAnswer: string, index: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isCorrect = userAnswer === question.correctAnswer;

  return (
    <div className={`border-2 rounded-2xl overflow-hidden transition-all ${
      isCorrect ? 'border-emerald-100 dark:border-emerald-900/30' : 'border-red-100 dark:border-red-900/30'
    }`}>
      {/* Clickable Header */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-4 flex items-start gap-4 text-left transition-colors ${
          isCorrect ? 'bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
        }`}
      >
        <div className="mt-1 shrink-0">
          {isCorrect ? (
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          ) : (
            <XCircle className="w-6 h-6 text-red-500" />
          )}
        </div>
        
        <div className="flex-1">
          <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm md:text-base pr-4">
            <span className="text-gray-400 dark:text-gray-500 mr-2">{index + 1}.</span>
            {question.question}
          </h4>
        </div>
        
        <div className="shrink-0 mt-1 text-gray-400">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Expandable Body */}
      {isOpen && (
        <div className="p-4 md:p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 space-y-4">
          
          {/* Answer Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Your Answer</span>
              <p className={`font-semibold text-sm ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {userAnswer || "Skipped / No Answer"}
              </p>
            </div>
            
            {!isCorrect && (
              <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1 block">Correct Answer</span>
                <p className="font-semibold text-sm text-emerald-800 dark:text-emerald-200">
                  {question.correctAnswer}
                </p>
              </div>
            )}
          </div>

          {/* Explanation Section */}
          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
             <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Rationale</span>
             </div>
             <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                <ReactMarkdown
                  components={{
                    strong: ({node, ...props}) => <strong className="font-bold text-gray-900 dark:text-white" {...props}/>,
                    em: ({node, ...props}) => <em className="italic text-gray-800 dark:text-gray-200" {...props}/>
                  }}
                >
                  {question.explanation}
                </ReactMarkdown>
             </div>
          </div>

        </div>
      )}
    </div>
  );
};

// Main Exported Module
export default function QuizRecap({ questions, userAnswers }: QuizRecapProps) {
  return (
    <div className="mt-12 w-full text-left">
      <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 px-2">Assessment Review</h3>
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <RecapItem 
            key={q.id || idx} 
            index={idx} 
            question={q} 
            userAnswer={userAnswers[idx]} 
          />
        ))}
      </div>
    </div>
  );
}