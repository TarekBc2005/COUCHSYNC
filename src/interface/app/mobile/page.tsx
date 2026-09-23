"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getRoomSync } from '@/lib/sync/roomSync';
import { SyncEvent, Participant } from '@/types/couchsync';
import { MOCK_MOVIES } from '@/data/mockMovies';
import { MOCK_QUESTIONS_POOL } from '@/data/mockQuestions';

import { MobileEntryScreen } from '@/components/mobile/MobileEntryScreen';
import { MobileLobbyScreen } from '@/components/mobile/MobileLobbyScreen';
import { MobileQuestionScreen } from '@/components/mobile/MobileQuestionScreen';
import { MobileVotingScreen } from '@/components/mobile/MobileVotingScreen';

type MobileScreen = 'ENTRY' | 'LOBBY' | 'QUESTIONS' | 'VOTING' | 'MATCH' | 'EMERGENCY';

function MobileApp() {
    const searchParams = useSearchParams();
    const userId = searchParams.get('user') || `u${Math.floor(Math.random() * 1000)}`;
    const userName = searchParams.get('name') || 'Invitado';

    const avatarLetters = userName.substring(0, 2).toUpperCase();
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
    const color = colors[parseInt(userId.replace(/\D/g, '') || '0') % colors.length] || colors[0];

    const me: Participant = {
        id: userId,
        name: userName,
        avatar: avatarLetters,
        color,
        joinedAt: Date.now()
    };

    const [screen, setScreen] = useState<MobileScreen>('ENTRY');
    const [participantCount, setParticipantCount] = useState(1);
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
    
    const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
    const [hasVoted, setHasVoted] = useState(false);
    const [matchTriggered, setMatchTriggered] = useState(false);
    const [vetoTriggered, setVetoTriggered] = useState(false);

    const sync = getRoomSync();

    useEffect(() => {
        sync.init();

        const unsubscribe = sync.subscribe((event: SyncEvent) => {
            switch(event.type) {
                case 'USER_JOINED':
                    setParticipantCount(prev => prev + 1);
                    break;
                case 'TV_START_SESSION':
                    setScreen('QUESTIONS');
                    break;
                case 'TV_NEXT_QUESTION':
                    setCurrentQuestionIndex(event.questionIndex);
                    setHasSubmittedAnswer(false);
                    setScreen('QUESTIONS');
                    break;
                case 'TV_START_VOTING':
                    setScreen('VOTING');
                    setHasVoted(false);
                    break;
                case 'TV_NEXT_MOVIE':
                    setCurrentMovieIndex(event.movieIndex);
                    setHasVoted(false);
                    setScreen('VOTING');
                    break;
                case 'TV_MATCH':
                    setMatchTriggered(true);
                    setScreen('MATCH');
                    break;
                case 'TV_EMERGENCY':
                    setScreen('EMERGENCY');
                    break;
                case 'TV_RESET':
                    setScreen('ENTRY');
                    setHasSubmittedAnswer(false);
                    setHasVoted(false);
                    setMatchTriggered(false);
                    setVetoTriggered(false);
                    break;
            }
        });

        sync.broadcast({ type: 'USER_JOINED', user: me });

        return () => {
            unsubscribe();
            sync.destroy();
        };
    }, []);

    const handleChooseWeb = () => {
        setScreen('LOBBY');
    };

    const handleSubmitAnswer = (questionId: string, optionId: string) => {
        sync.broadcast({ type: 'MOBILE_ANSWER', userId: me.id, questionId, optionId });
        setHasSubmittedAnswer(true);
    };

    const handleVote = (movieId: string, decision: 'LIKE' | 'VETO') => {
        sync.broadcast({ type: 'MOBILE_VOTE', userId: me.id, movieId, decision });
        setHasVoted(true);
    };

    const renderScreen = () => {
        switch(screen) {
            case 'ENTRY':
                return <MobileEntryScreen userName={me.name} onChooseWeb={handleChooseWeb} />;
            case 'LOBBY':
                return (
                    <MobileLobbyScreen 
                        userName={me.name}
                        userAvatar={me.avatar}
                        userColor={me.color}
                        participantCount={participantCount}
                    />
                );
            case 'QUESTIONS':
                return (
                    <MobileQuestionScreen 
                        question={MOCK_QUESTIONS_POOL[currentQuestionIndex]}
                        questionIndex={currentQuestionIndex}
                        totalQuestions={MOCK_QUESTIONS_POOL.length}
                        onSubmitAnswer={handleSubmitAnswer}
                        hasSubmitted={hasSubmittedAnswer}
                    />
                );
            case 'VOTING':
                return (
                    <MobileVotingScreen 
                        movie={MOCK_MOVIES[currentMovieIndex]}
                        onVote={handleVote}
                        hasVoted={hasVoted}
                        matchTriggered={matchTriggered}
                        vetoTriggered={vetoTriggered}
                    />
                );
            case 'MATCH':
                return (
                    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-green-900/40">
                        <h2 className="text-4xl font-extrabold text-white mb-4 animate-bounce">¡HAY MATCH! 🎉</h2>
                        <p className="text-green-300 text-lg">Mira a la pantalla grande.</p>
                    </div>
                );
            case 'EMERGENCY':
                return (
                    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-red-900/40">
                        <h2 className="text-3xl font-extrabold text-white mb-4">🚨 EMERGENCIA 🚨</h2>
                        <p className="text-red-300 text-lg">Demasiados vetos o tiempo agotado. Resolviendo en la TV...</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-[100dvh] w-full bg-[#0f1015] text-white overflow-hidden flex flex-col relative">
            {renderScreen()}
        </div>
    );
}

export default function MobilePage() {
    return (
        <Suspense fallback={<div className="min-h-[100dvh] bg-[#0f1015] text-white flex items-center justify-center">Cargando...</div>}>
            <MobileApp />
        </Suspense>
    );
}
