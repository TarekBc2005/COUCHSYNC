"use client";

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Question } from '@/types/couchsync';

interface MobileQuestionScreenProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  onSubmitAnswer: (questionId: string, optionId: string) => void;
  hasSubmitted: boolean;
}

export const MobileQuestionScreen: React.FC<MobileQuestionScreenProps> = ({
  question,
  questionIndex,
  totalQuestions,
  onSubmitAnswer,
  hasSubmitted
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (selectedOptionId && !hasSubmitted) {
      onSubmitAnswer(question.id, selectedOptionId);
    }
  };

  if (hasSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-black text-white p-6 items-center justify-center text-center">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
          <Check size={40} className="text-black" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Respuesta enviada ✓</h2>
        <div className="flex space-x-2 mt-4 justify-center items-center">
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-gray-400 mt-4">Esperando al resto del grupo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white p-6">
      <div className="flex justify-center mb-8 mt-2">
        <div className="bg-white/10 px-4 py-1.5 rounded-full text-sm font-medium text-white/80">
          Pregunta {questionIndex + 1} de {totalQuestions}
        </div>
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-3 leading-tight">{question.title}</h1>
        {question.subtitle && (
          <p className="text-gray-400 text-lg">{question.subtitle}</p>
        )}
      </div>

      <div className="space-y-4 flex-1">
        {question.options.map((option) => (
          <button
            key={option.id}
            onClick={() => setSelectedOptionId(option.id)}
            className={`w-full p-5 rounded-2xl text-left transition-all flex justify-between items-center ${
              selectedOptionId === option.id 
                ? 'bg-white text-black' 
                : 'bg-[#1e1f29] text-white hover:bg-[#252733] border border-white/5'
            }`}
          >
            <div className="pr-4">
              <span className="text-lg font-semibold block">{option.label}</span>
              {option.description && (
                <span className={`text-xs block mt-1 ${selectedOptionId === option.id ? 'text-gray-700' : 'text-gray-400'}`}>
                  {option.description}
                </span>
              )}
            </div>
            {selectedOptionId === option.id && (
              <Check size={20} className="text-black shrink-0" />
            )}
          </button>
        ))}
      </div>

      <div className="pt-6 mt-auto">
        <button
          onClick={handleSubmit}
          disabled={!selectedOptionId}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
            selectedOptionId 
              ? 'bg-white text-black hover:bg-gray-200' 
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          Enviar respuesta
        </button>
      </div>
    </div>
  );
};
