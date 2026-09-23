"use client";

import React, { useState, useEffect, useRef } from "react";
import { TVScreen, Participant, Movie, Question } from "@/types/couchsync";
import { MOCK_MOVIES, EMERGENCY_TOP_5 } from "@/data/mockMovies";
import { MOCK_QUESTIONS_POOL, getRandomQuestionBatch } from "@/data/mockQuestions";

// Components
import { TVNavbar } from "@/components/layout/TVNavbar";
import { NetflixHomeScreen } from "@/components/tv/NetflixHomeScreen";
import { RoomQRScreen } from "@/components/tv/RoomQRScreen";
import { QuestionnaireScreen } from "@/components/tv/QuestionnaireScreen";
import { VotingCarouselScreen } from "@/components/tv/VotingCarouselScreen";
import { TrailerScreen } from "@/components/tv/TrailerScreen";
import { NoTrailerPlayerScreen } from "@/components/tv/NoTrailerPlayerScreen";
import { SessionTimeoutScreen } from "@/components/tv/SessionTimeoutScreen";
import { EmergencyTop5Screen } from "@/components/tv/EmergencyTop5Screen";
import { WatchingScreen } from "@/components/tv/WatchingScreen";
import SoloVoiceScreen from "@/components/tv/SoloVoiceScreen";
import { TMDBSearchModal } from "@/components/tv/TMDBSearchModal";

export default function CouchSyncTV() {
  const [currentScreen, setCurrentScreen] = useState<TVScreen>("HOME");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeMovie, setActiveMovie] = useState<Movie>(MOCK_MOVIES[0]);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [roundLabel, setRoundLabel] = useState<string>("Ronda Inicial");

  // TMDB Catalog State
  const [tmdbCategories, setTmdbCategories] = useState<{
    trending?: Movie[];
    topRated?: Movie[];
    action?: Movie[];
    scifi?: Movie[];
    comedy?: Movie[];
    drama?: Movie[];
  }>({});
  const [catalogMovies, setCatalogMovies] = useState<Movie[]>(MOCK_MOVIES);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("inicio");

  // Dynamic Questions & Movies State
  const [questionCursor, setQuestionCursor] = useState<number>(3);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>(() =>
    getRandomQuestionBatch(3)
  );
  const [movieBatchIndex, setMovieBatchIndex] = useState<number>(0);
  const [currentMovieBatch, setCurrentMovieBatch] = useState<Movie[]>(
    MOCK_MOVIES.slice(0, 3)
  );

  // 10-Minute Background Safety Timer State (600s)
  const [groupTimerSeconds, setGroupTimerSeconds] = useState<number>(600);
  const [isGroupSessionActive, setIsGroupSessionActive] = useState<boolean>(false);

  // Fetch real TMDB catalog on mount
  useEffect(() => {
    let active = true;
    async function loadTmdbCatalog() {
      try {
        const res = await fetch("/api/tmdb?action=home");
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && data.categories && active) {
          setTmdbCategories(data.categories);
          const allLoaded: Movie[] = [
            ...(data.categories.trending || []),
            ...(data.categories.topRated || []),
            ...(data.categories.action || []),
            ...(data.categories.scifi || []),
          ];
          if (allLoaded.length > 0) {
            setCatalogMovies(allLoaded);
            if (data.categories.trending?.[0]) {
              setActiveMovie(data.categories.trending[0]);
            }
          }
        }
      } catch (err) {
        console.error("Error loading TMDB catalog on TV:", err);
      }
    }
    loadTmdbCatalog();
    return () => {
      active = false;
    };
  }, []);

  // Dynamic Room Code for Isolated Telegram & Mobile Sessions
  const [roomCode, setRoomCode] = useState<string>("ROOM_742");

  // Sync real Telegram participants globally across screens
  useEffect(() => {
    let active = true;
    const pollParticipants = async () => {
      try {
        const res = await fetch("/api/telegram/sync");
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && active) {
          if (data.roomCode) {
            setRoomCode(data.roomCode);
          }
          if (Array.isArray(data.participants)) {
            setParticipants(
              data.participants.map((tp: any) => ({
                id: tp.id,
                name: tp.name,
                avatar: tp.avatar,
                color: tp.color,
                status: "ready",
                joinedAt: tp.joinedAt,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Error syncing participants:", err);
      }
    };

    pollParticipants();
    const interval = setInterval(pollParticipants, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // 10-Minute Hidden Background Safety Timer
  useEffect(() => {
    if (!isGroupSessionActive) return;

    const timer = setInterval(() => {
      setGroupTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsGroupSessionActive(false);
          setCurrentScreen("SESSION_TIMEOUT");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isGroupSessionActive]);

  // Remote Keyboard navigation (Escape -> Home / Close Search) & Direct URL Navigation (?screen=consensus)
  useEffect(() => {
    // Check URL parameters for direct test navigation
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const screenParam = params.get("screen")?.toLowerCase();
      if (screenParam === "consensus" || screenParam === "emergency" || screenParam === "top5" || screenParam === "lab") {
        setCurrentScreen("EMERGENCY_TOP5");
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isSearchOpen) {
          setIsSearchOpen(false);
          return;
        }
        if (currentScreen !== "HOME") {
          handleReset();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, currentScreen]);

  // Actions
  const handleStartSolo = () => {
    setCurrentScreen("SOLO_VOICE");
  };

  const handleStartGroup = () => {
    setIsGroupSessionActive(true);
    setGroupTimerSeconds(600);
    const freshCode = "ROOM_" + Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(freshCode);
    setParticipants([]);
    fetch("/api/telegram/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true, roomCode: freshCode }),
    }).catch(console.error);
    setCurrentScreen("GROUP_ROOM");
  };

  const handleOpenConsensus = () => {
    setCurrentScreen("EMERGENCY_TOP5");
  };

  const handleAddParticipant = () => {
    const names = ["Mateo R.", "Elena V.", "David P.", "Nuria B."];
    const colors = ["bg-purple-500", "bg-teal-500", "bg-orange-500", "bg-rose-500"];
    const randomIdx = Math.floor(Math.random() * names.length);
    const chosenName = names[randomIdx];

    fetch("/api/telegram/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "JOIN_WEB_USER",
        name: chosenName,
      }),
    }).catch(console.error);
  };

  // Smart Movie Selection (checks trailer in TMDB -> TrailerScreen vs NoTrailerPlayerScreen)
  const handleSelectMovie = async (movie: Movie) => {
    let resolvedMovie = { ...movie };

    // If no trailer yet, query TMDB for YouTube trailer
    if (!resolvedMovie.trailerYoutubeId) {
      try {
        const res = await fetch(`/api/tmdb?action=trailer&id=${resolvedMovie.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.trailerKey) {
            resolvedMovie.trailerYoutubeId = data.trailerKey;
          }
        }
      } catch (err) {
        console.warn("Could not fetch trailer for movie:", err);
      }
    }

    setActiveMovie(resolvedMovie);

    // Directive 3: If trailer exists -> TrailerScreen; if NO trailer -> NoTrailerPlayerScreen ("pantalla muerta")
    if (resolvedMovie.trailerYoutubeId && resolvedMovie.trailerYoutubeId.trim() !== "") {
      setCurrentScreen("TRAILER");
    } else {
      setCurrentScreen("NO_TRAILER_PLAYER");
    }
  };

  // Room answers aggregated across rounds
  const [roomAnswersMap, setRoomAnswersMap] = useState<Record<string, Record<string, string>>>({});
  const [, setAlgorithmicPool] = useState<Movie[]>([]);
  const [discardedMovies, setDiscardedMovies] = useState<Movie[]>([]);

  const handleDiscardMovie = (movie: Movie) => {
    setDiscardedMovies((prev) => {
      if (prev.some((m) => m.id === movie.id)) return prev;
      const updated = [...prev, movie];
      return updated.sort((a, b) => {
        const scoreA = typeof a.matchScore === "number" && a.matchScore > 0 ? a.matchScore : Math.round(a.rating * 10);
        const scoreB = typeof b.matchScore === "number" && b.matchScore > 0 ? b.matchScore : Math.round(b.rating * 10);
        return scoreB - scoreA;
      });
    });
  };

  // Start Questionnaire (Round 1: 3 diverse questions)
  const handleStartQuestionnaire = () => {
    setIsGroupSessionActive(true);
    setGroupTimerSeconds(600);
    setRoomAnswersMap({});
    setAlgorithmicPool([]);
    setDiscardedMovies([]);
    const round1Questions = getRandomQuestionBatch(3);
    setCurrentQuestions(round1Questions);
    setMovieBatchIndex(0);

    // Use TMDB movies if available, else fallback to mock
    const pool = catalogMovies.length >= 6 ? catalogMovies : MOCK_MOVIES;
    setCurrentMovieBatch(pool.slice(0, 3));
    setRoundNumber(1);
    setRoundLabel("Ronda 1: Preferencias");
    setCurrentScreen("GROUP_QUESTIONS");
  };

  // Questionnaire Completed -> Run Local Algorithmic Intelligence with TMDB
  const handleQuestionsComplete = async (newAnswersMap: Record<string, Record<string, string>>) => {
    const mergedAnswers = { ...roomAnswersMap, ...newAnswersMap };
    setRoomAnswersMap(mergedAnswers);

    try {
      const res = await fetch("/api/tmdb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECOMMENDATIONS",
          answers: mergedAnswers,
          participantsCount: participants.length || 1,
          page: movieBatchIndex + 1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.movies && data.movies.length > 0) {
          setAlgorithmicPool(data.movies);
          setCurrentMovieBatch(data.movies.slice(0, 3));
          setCurrentScreen("GROUP_VOTING");
          return;
        }
      }
    } catch (err) {
      console.error("Failed to fetch algorithmic recommendations:", err);
    }

    // Fallback if TMDB request fails
    const pool = catalogMovies.length >= 6 ? catalogMovies : MOCK_MOVIES;
    const start = (movieBatchIndex * 3) % pool.length;
    const batch = [
      pool[start % pool.length],
      pool[(start + 1) % pool.length],
      pool[(start + 2) % pool.length],
    ];
    setCurrentMovieBatch(batch);
    setCurrentScreen("GROUP_VOTING");
  };

  // Movie Matched -> Check trailer and open player or trailer
  const handleLikeMovie = (movie: Movie) => {
    // Consensus reached! Stop safety countdown
    setIsGroupSessionActive(false);
    handleSelectMovie(movie);
  };

  // Batch exhausted without a match -> Check Circuit Breaker (Max 2 Question Rounds OR 3 Total Vetoes)
  const handleBatchExhausted = () => {
    // CIRCUIT BREAKER: If users still disagree after Round 2, OR have accumulated 3 total vetoes
    if (roundNumber >= 2 || discardedMovies.length >= 3) {
      console.log(
        `[CIRCUIT BREAKER] Deadlock triggered: roundNumber=${roundNumber}, discardedMovies=${discardedMovies.length}. Auto-escalating to AI Consensus Lab.`
      );

      // 1. Notify Telegram & Web participants
      fetch("/api/telegram/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "BROADCAST_DEADLOCK" }),
      }).catch(console.error);

      // 2. Stop safety timer and route directly to AI Consensus Lab (Top 4 + Radar Chart)
      setIsGroupSessionActive(false);
      setCurrentScreen("EMERGENCY_TOP5");
      return;
    }

    // Round 2 (The 1 allowed follow-up refinement round: exactly 3 new questions)
    const nextRound = 2;
    const nextMovieBatch = movieBatchIndex + 1;

    // Pick next 3 refinement questions randomly excluding those already asked
    const askedIds = currentQuestions.map((q) => q.id);
    const next3Questions = getRandomQuestionBatch(3, askedIds);

    setRoundNumber(nextRound);
    setMovieBatchIndex(nextMovieBatch);
    setCurrentQuestions(next3Questions);
    setRoundLabel(`Ronda 2: Reajuste (Final)`);

    // Reset currentMovie on server so Telegram & Web switch back to questions
    fetch("/api/telegram/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CLEAR_MOVIE" }),
    }).catch(console.error);

    setCurrentScreen("GROUP_QUESTIONS");
  };

  const handleAcceptMovie = (movie: Movie) => {
    setActiveMovie(movie);
    setCurrentScreen("WATCHING");
  };

  const handleDiscardTrailerMovie = () => {
    if (activeMovie) {
      handleDiscardMovie(activeMovie);
    }
    handleBatchExhausted();
  };

  const handleRestartGroupSession = () => {
    setGroupTimerSeconds(600);
    setIsGroupSessionActive(true);
    setDiscardedMovies([]);
    handleStartQuestionnaire();
  };

  const handleReset = async () => {
    setIsGroupSessionActive(false);
    setGroupTimerSeconds(600);
    setDiscardedMovies([]);
    setRoomAnswersMap({});
    setParticipants([]);
    setRoundNumber(1);
    setActiveCategoryFilter("inicio");
    const freshCode = "ROOM_" + Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(freshCode);
    setCurrentScreen("HOME");

    try {
      await fetch("/api/telegram/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true, roomCode: freshCode }),
      });
    } catch (e) {
      console.error("Error auto-resetting room session:", e);
    }
  };

  return (
    <main className="relative min-h-screen bg-black text-slate-100 selection:bg-red-600 selection:text-white font-sans overflow-x-hidden">
      {/* Top Navbar on Home & Browsing */}
      {currentScreen === "HOME" && (
        <TVNavbar
          onOpenGroupModal={handleStartGroup}
          onStartSolo={handleStartSolo}
          onGoHome={handleReset}
          onOpenSearch={() => setIsSearchOpen(true)}
          onSelectCategory={(cat) => setActiveCategoryFilter(cat)}
          activeTab={activeCategoryFilter}
          connectedCount={participants.length}
        />
      )}

      {/* Global Interactive Search Modal for TMDB Catalog */}
      <TMDBSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectMovie={handleSelectMovie}
      />

      {/* Screen Router */}
      {currentScreen === "HOME" && (
        <NetflixHomeScreen
          featuredMovie={activeMovie}
          moviesList={catalogMovies}
          categories={tmdbCategories}
          activeCategoryFilter={activeCategoryFilter}
          onOpenGroupModal={handleStartGroup}
          onStartSolo={handleStartSolo}
          onSelectMovie={handleSelectMovie}
        />
      )}

      {currentScreen === "SOLO_VOICE" && (
        <SoloVoiceScreen
          movies={catalogMovies}
          onSelectMovie={handleSelectMovie}
          onBack={handleReset}
        />
      )}

      {currentScreen === "GROUP_ROOM" && (
        <RoomQRScreen
          roomCode={roomCode}
          participants={participants}
          onAddParticipant={handleAddParticipant}
          onSetParticipants={setParticipants}
          onStart={handleStartQuestionnaire}
          onBack={handleReset}
          onResetRoom={() => {
            const fresh = "ROOM_" + Math.random().toString(36).substring(2, 6).toUpperCase();
            setRoomCode(fresh);
            setParticipants([]);
            fetch("/api/telegram/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reset: true, roomCode: fresh }),
            }).catch(console.error);
          }}
        />
      )}

      {currentScreen === "GROUP_QUESTIONS" && (
        <QuestionnaireScreen
          questionsPool={currentQuestions}
          participants={participants}
          roundLabel={roundLabel}
          onComplete={handleQuestionsComplete}
          onBack={handleReset}
        />
      )}

      {currentScreen === "GROUP_VOTING" && (
        <VotingCarouselScreen
          movies={currentMovieBatch}
          participants={participants}
          roundNumber={roundNumber}
          onLike={handleLikeMovie}
          onDiscard={handleDiscardMovie}
          onBatchExhausted={handleBatchExhausted}
          onBack={handleReset}
        />
      )}

      {currentScreen === "TRAILER" && (
        <TrailerScreen
          movie={activeMovie}
          onAccept={handleAcceptMovie}
          onDiscard={handleDiscardTrailerMovie}
          onGoHome={handleReset}
        />
      )}

      {currentScreen === "NO_TRAILER_PLAYER" && (
        <NoTrailerPlayerScreen
          movie={activeMovie}
          onGoHome={handleReset}
        />
      )}

      {currentScreen === "SESSION_TIMEOUT" && (
        <SessionTimeoutScreen
          onRestartSession={handleRestartGroupSession}
          onGoHome={handleReset}
        />
      )}

      {currentScreen === "EMERGENCY_TOP5" && (
        <EmergencyTop5Screen
          movies={catalogMovies.length ? catalogMovies : EMERGENCY_TOP_5}
          participants={participants}
          discardedMovies={discardedMovies}
          roomAnswersMap={roomAnswersMap}
          onSelectMovie={handleAcceptMovie}
          onGoHome={handleReset}
        />
      )}

      {currentScreen === "WATCHING" && (
        <WatchingScreen movie={activeMovie} onReset={handleReset} />
      )}
    </main>
  );
}
