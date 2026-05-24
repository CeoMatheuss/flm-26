import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Globe, Loader2, Sparkles, ChevronRight, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface Props {
  userId?: string;
  onOpenWorldCup: () => void;
}

export function WorldCupTeaser({ userId, onOpenWorldCup }: Props) {
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveWorldCup = async () => {
      try {
        const { data } = await supabase
          .from('tournaments')
          .select('*')
          .eq('type', 'world_cup')
          .order('season', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        setTournament(data);
      } catch (err) {
        console.error('Error fetching world cup teaser:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveWorldCup();
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleMusic = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) {
      audioRef.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (loading) return null;

  if (!tournament) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-4"
    >
      <Card 
        className="game-card overflow-hidden border-primary/40 bg-[#0a0a1a] cursor-pointer hover:border-primary transition-all group relative"
        onClick={onOpenWorldCup}
      >
        {/* Animated Glow Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-30 group-hover:opacity-50 transition-opacity" />
        
        <CardContent className="p-0">
          <div className="flex items-center gap-4 p-4 relative z-10">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              <Trophy className="h-10 w-10 md:h-12 md:w-12 text-primary drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black tracking-widest uppercase">
                  Mundial de Clubes
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-6 w-6 rounded-full ${isPlaying ? 'text-primary animate-pulse' : 'text-muted-foreground'}`}
                  onClick={toggleMusic}
                >
                  <Music className="h-3 w-3" />
                </Button>
                <span className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground uppercase ml-auto">
                  <Globe className="h-2 w-2" /> {tournament.host_country || 'Global'}
                </span>

              </div>
              <h3 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-white leading-none">
                Super Mundial <span className="text-primary italic font-black">FLM</span>
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium group-hover:text-white/70 transition-colors">
                Temporada {tournament.season} • A glória máxima do futebol.
              </p>
            </div>

            <div className="shrink-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <ChevronRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Progress or Status Bar */}
          <div className="bg-primary/10 h-1 w-full overflow-hidden">
             <motion.div 
               className="h-full bg-primary"
               initial={{ width: "0%" }}
               animate={{ width: "100%" }}
               transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
             />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
