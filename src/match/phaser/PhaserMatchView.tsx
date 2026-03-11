/**
 * PhaserMatchView — React wrapper for the Phaser football scene.
 * Receives match state from MatchManager and passes it to the Phaser scene.
 */

import { useRef, useEffect, memo } from 'react';
import Phaser from 'phaser';
import { FootballScene } from './FootballScene';
import { Card } from '@/components/ui/card';
import { SimEvent } from '@/match/SimulationEngine';

interface PhaserMatchViewProps {
  currentMinute: number;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  visibleEvents: SimEvent[];
  isFinished: boolean;
  goalFlash: boolean;
  formation?: string;
}

function PhaserMatchViewInner({
  currentMinute, homeTeam, awayTeam, homeGoals, awayGoals,
  visibleEvents, isFinished, goalFlash, formation,
}: PhaserMatchViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<FootballScene | null>(null);

  // Initialize Phaser game on mount
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const scene = new FootballScene();
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 800,
      height: 500,
      backgroundColor: '#1a6b3c',
      scene: scene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
      audio: { noAudio: true },
      input: { mouse: false, touch: false, keyboard: false },
      fps: { target: 60, forceSetTimeOut: false },
      banner: false,
    });

    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // Update scene data whenever props change
  useEffect(() => {
    if (!sceneRef.current) return;

    sceneRef.current.setMatchData({
      events: visibleEvents,
      currentMinute,
      homeGoals,
      awayGoals,
      isFinished,
      homeTeam,
      awayTeam,
      formation,
    });
  }, [visibleEvents, currentMinute, homeGoals, awayGoals, isFinished, homeTeam, awayTeam, formation]);

  return (
    <Card className="p-1.5 overflow-hidden">
      <div className="relative w-full aspect-[8/5]">
        <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" />
        {/* Score overlay */}
        <div className="absolute top-1 left-2 right-2 flex justify-between items-center pointer-events-none">
          <span className="text-[9px] font-bold text-blue-300 drop-shadow-md bg-black/30 px-1.5 py-0.5 rounded">
            {homeTeam}
          </span>
          <span className={`text-[12px] font-mono font-black drop-shadow-md transition-all bg-black/40 px-2 py-0.5 rounded ${
            goalFlash ? 'text-yellow-300 scale-110' : 'text-white'
          }`}>
            {homeGoals} × {awayGoals}
          </span>
          <span className="text-[9px] font-bold text-red-300 drop-shadow-md bg-black/30 px-1.5 py-0.5 rounded">
            {awayTeam}
          </span>
        </div>
        {/* Minute */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-[10px] font-mono text-white/80 bg-black/40 px-2 py-0.5 rounded">
            {currentMinute}'
          </span>
        </div>
        {/* Finished overlay */}
        {isFinished && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <span className="text-white font-bold text-lg tracking-widest animate-fade-in">
              FIM DE JOGO
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export const PhaserMatchView = memo(PhaserMatchViewInner);
