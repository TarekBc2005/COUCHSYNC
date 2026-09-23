"use client";

import React, { useState, useEffect } from "react";
import { Question, Participant } from "../../types/couchsync";
import { ArrowLeft, Send, CheckCircle2, Clock, Sparkles } from "lucide-react";

interface QuestionnaireScreenProps {
  questionsPool: Question[];
  participants: Participant[];
  roundLabel?: string;
  onComplete: (answersMap: Record<string, Record<string, string>>) => void;
  onBack: () => void;
}

export const QuestionnaireScreen: React.FC<QuestionnaireScreenProps> = ({
  questionsPool,
  participants,
  roundLabel = "Ronda Inicial",
  onComplete,
  onBack,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<string, Record<string, string>>>({});
  const [advancing, setAdvancing] = useState(false);
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>(participants);

  const currentIdxRef = React.useRef(0);
  const questionsPoolRef = React.useRef(questionsPool);
  const answersMapRef = React.useRef(answersMap);
  const isAdvancingRef = React.useRef(false);
  const advanceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    questionsPoolRef.current = questionsPool;
  }, [questionsPool]);

  useEffect(() => {
    answersMapRef.current = answersMap;
  }, [answersMap]);

  useEffect(() => {
    currentIdxRef.current = currentIdx;
  }, [currentIdx]);

  // Reset index and state when questions pool changes
  useEffect(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    setCurrentIdx(0);
    currentIdxRef.current = 0;
    setAnswersMap({});
    answersMapRef.current = {};
    isAdvancingRef.current = false;
    setAdvancing(false);
  }, [questionsPool]);

  const question = questionsPool[currentIdx] || questionsPool[0];

  // Current question answers: userId -> optionId
  const currentAnswers = answersMap[question?.id || ""] || {};
  const activeParticipants = liveParticipants.length > 0 ? liveParticipants : participants;

  // Broadcast question to Telegram whenever it changes
  useEffect(() => {
    if (!question) return;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    isAdvancingRef.current = false;
    setAdvancing(false);

    fetch("/api/telegram/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "BROADCAST_QUESTION",
        question: {
          id: question.id,
          title: question.title,
          subtitle: question.subtitle,
          options: question.options.map((o) => ({
            id: o.id,
            label: o.label,
            description: o.description,
          })),
        },
        questionIndex: currentIdx,
        totalQuestions: questionsPool.length,
      }),
    }).catch(console.error);
  }, [currentIdx, question?.id, questionsPool.length]);

  // Poll Telegram for answers every 1.5s
  useEffect(() => {
    if (!question?.id) return;
    let active = true;
    const pollAnswers = async () => {
      try {
        const res = await fetch("/api/telegram/sync");
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && active) {
          if (data.answers) {
            setAnswersMap(data.answers);
            answersMapRef.current = data.answers;
          }
          if (data.participants && data.participants.length > 0) {
            setLiveParticipants((prev) => {
              const map = new Map<string, Participant>();
              prev.forEach((p) => map.set(p.id, p));
              data.participants.forEach((tp: any) => {
                map.set(tp.id, {
                  id: tp.id,
                  name: tp.name,
                  avatar: tp.avatar,
                  color: tp.color,
                  status: "ready",
                  joinedAt: tp.joinedAt,
                });
              });
              return Array.from(map.values());
            });
          }
        }
      } catch (err) {
        console.error("Error polling answers:", err);
      }
    };

    pollAnswers();
    const interval = setInterval(pollAnswers, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [question?.id]);

  // Check if all connected participants have answered
  const answeredCount = activeParticipants.filter((p) => currentAnswers[p.id]).length;
  const totalVotesRecorded = Object.keys(currentAnswers).length;
  const allAnswered =
    activeParticipants.length > 0 &&
    (answeredCount >= activeParticipants.length || totalVotesRecorded >= activeParticipants.length);

  const executeAdvance = React.useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    const current = currentIdxRef.current;
    const pool = questionsPoolRef.current;

    if (current < pool.length - 1) {
      const nextIdx = current + 1;
      currentIdxRef.current = nextIdx;
      setCurrentIdx(nextIdx);
      isAdvancingRef.current = false;
      setAdvancing(false);
    } else {
      isAdvancingRef.current = true;
      setAdvancing(true);
      onComplete(answersMapRef.current);
    }
  }, [onComplete]);

  // Keyboard shortcut to advance with Enter / Space / ArrowRight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
        executeAdvance();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [executeAdvance]);

  // Auto-advance safely when all participants have answered
  useEffect(() => {
    if (allAnswered && !isAdvancingRef.current) {
      isAdvancingRef.current = true;
      setAdvancing(true);
      advanceTimerRef.current = setTimeout(() => {
        executeAdvance();
      }, 1000);
    }
  }, [allAnswered, executeAdvance]);

  return (
    <div className="relative w-full min-h-screen bg-black text-white flex flex-col justify-between px-8 sm:px-16 py-10 overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-red-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Top Bar */}
      <div className="flex items-center justify-between z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-xs font-semibold text-blue-400">
            <Send className="w-3.5 h-3.5" />
            <span>Votando en Telegram / Web Móvil</span>
          </div>

          <span className="text-xs font-mono text-slate-400 uppercase tracking-widest bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full">
            {roundLabel} • Pregunta {currentIdx + 1} de {questionsPool.length}
          </span>
        </div>
      </div>

      {/* Main Question Display */}
      <div className="max-w-5xl w-full mx-auto my-auto z-10 py-6 text-center space-y-6">
        <div className="space-y-3">
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            {question.title}
          </h2>
          <p className="text-slate-400 text-lg sm:text-xl font-light max-w-2xl mx-auto">
            {question.subtitle}
          </p>
        </div>

        {/* Options Grid (Display-only for the TV) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left max-w-4xl mx-auto pt-4">
          {question.options.map((opt) => {
            const voters = participants.filter((p) => currentAnswers[p.id] === opt.id);
            const hasVoters = voters.length > 0;

            return (
              <div
                key={opt.id}
                className={`relative p-6 rounded-3xl border transition-all duration-300 ${
                  hasVoters
                    ? "bg-slate-900/90 border-red-500/80 shadow-lg shadow-red-950/40 scale-[1.01]"
                    : "bg-slate-950/60 border-slate-800/80 text-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="text-xl font-bold text-white flex items-center gap-2">
                      <span>{opt.label}</span>
                      {hasVoters && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/30 text-red-400 font-bold border border-red-500/40">
                          {voters.length} voto{voters.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{opt.description}</p>
                  </div>
                </div>

                {/* Avatars of people who voted for this option */}
                {hasVoters && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
                    <span className="text-[11px] text-slate-400">Elegido por:</span>
                    <div className="flex items-center -space-x-2">
                      {voters.map((v) => (
                        <div
                          key={v.id}
                          className={`w-7 h-7 rounded-full ${v.color} border-2 border-black flex items-center justify-center text-xs font-bold text-white shadow-md animate-in zoom-in`}
                          title={v.name}
                        >
                          {v.avatar}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Vote Status Alert Banner */}
        <div className="pt-2">
          {allAnswered ? (
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold animate-in zoom-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>¡Todos habéis votado! Pasando a la siguiente pregunta...</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-sm">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span>
                Esperando respuestas en Telegram / Web: <b>{answeredCount}</b> de <b>{activeParticipants.length}</b> han votado
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Live Participants Bar */}
      <div className="w-full max-w-4xl mx-auto border-t border-slate-800/80 pt-6 z-20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Participantes ({activeParticipants.length}):
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeParticipants.map((p) => {
            const hasVoted = Boolean(currentAnswers[p.id]);

            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  hasVoted
                    ? "bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-950"
                    : "bg-slate-900 border-slate-800 text-slate-400 animate-pulse"
                }`}
              >
                <div className={`w-5 h-5 rounded-full ${p.color} flex items-center justify-center text-[10px] font-bold text-white`}>
                  {p.avatar}
                </div>
                <span>{p.name}</span>
                {hasVoted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className="text-[10px] text-amber-400">Votando...</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Host manual skip button */}
        <button
          onClick={executeAdvance}
          className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer shadow-md"
          title="Avanzar manualmente si alguien tarda o no responde"
        >
          <span>Siguiente pregunta</span>
          <span className="text-[10px] text-slate-400 font-mono">[Enter]</span>
          <span>➔</span>
        </button>
      </div>
    </div>
  );
};
