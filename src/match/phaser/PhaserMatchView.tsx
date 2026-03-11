/**
 * PhaserMatchView — React wrapper for the Phaser 2D football simulation.
 * Manages Phaser lifecycle and passes match data to FootballScene.
 */

import { useRef, useEffect, memo } from 'react';
import Phaser from 'phaser';
import { FootballScene } from './FootballScene';
import { SimEvent } from '@/match/SimulationEngine';

interface PhaserMatchViewProps {
  currentMinute: number;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  visibleEvents: SimEvent[];
  isFinished: boolean;
  formation?: string;
  possession?: [number, number];
  progress?: number;
  phase?: string;
}

function PhaserMatchViewInner({
  currentMinute, homeTeam, awayTeam, homeGoals, awayGoals,
  visibleEvents, isFinished, formation, possession, progress, phase,
}: PhaserMatchViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<FootballScene | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const scene = new FootballScene();
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 900,
      height: 560,
      backgroundColor: '#0f1a0f',
      scene: scene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: { antialias: true, pixelArt: false },
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
      possession,
      progress,
      phase,
    });
  }, [visibleEvents, currentMinute, homeGoals, awayGoals, isFinished, homeTeam, awayTeam, formation, possession, progress, phase]);

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border/30 shadow-lg bg-[#0f1a0f]">
      <div className="relative w-full" style={{ aspectRatio: '900 / 560' }}>
        <div ref={containerRef} className="w-full h-full" />
        {isFinished && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center space-y-1">
              <span className="text-2xl font-black tracking-widest text-white/90">
                FIM DE JOGO
              </span>
              <p className="text-sm text-white/50 font-mono">
                {homeGoals} × {awayGoals}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const PhaserMatchView = memo(PhaserMatchViewInner);
