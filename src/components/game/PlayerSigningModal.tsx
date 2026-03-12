/**
 * PlayerSigningModal — Shows a celebratory modal when a player is bought,
 * with an SVG jersey in the team's colors and "ASSINADO" badge.
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Star } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  playerName: string;
  playerPosition: string;
  playerOverall: number;
  playerAge: number;
  primaryColor: string;
  secondaryColor: string;
  clubName: string;
}

export function PlayerSigningModal({ open, onClose, playerName, playerPosition, playerOverall, playerAge, primaryColor, secondaryColor, clubName }: Props) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (open) {
      setShowContent(false);
      const timer = setTimeout(() => setShowContent(true), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Auto-close after 4 seconds
  useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, 4500);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xs p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <div className={`relative rounded-2xl overflow-hidden transition-all duration-700 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          {/* Background gradient with team colors */}
          <div 
            className="absolute inset-0 opacity-90"
            style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor}33 50%, ${primaryColor} 100%)` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

          <div className="relative z-10 p-6 flex flex-col items-center text-center gap-3">
            {/* ASSINADO badge */}
            <div className={`transition-all duration-500 delay-300 ${showContent ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
              <Badge className="bg-emerald-500 text-white font-black text-sm px-4 py-1 shadow-lg">
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> ASSINADO ✍️
              </Badge>
            </div>

            {/* Jersey SVG */}
            <div className={`transition-all duration-500 delay-500 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <svg width="120" height="140" viewBox="0 0 120 140" className="drop-shadow-2xl">
                {/* Jersey body */}
                <path
                  d="M30 35 L10 50 L10 130 L110 130 L110 50 L90 35 L80 25 Q60 15 40 25 Z"
                  fill={primaryColor}
                  stroke={secondaryColor}
                  strokeWidth="2"
                />
                {/* Collar */}
                <path
                  d="M40 25 Q60 20 80 25 Q70 35 60 35 Q50 35 40 25Z"
                  fill={secondaryColor}
                />
                {/* Sleeves */}
                <path d="M30 35 L10 50 L15 55 L35 42 Z" fill={primaryColor} stroke={secondaryColor} strokeWidth="1" />
                <path d="M90 35 L110 50 L105 55 L85 42 Z" fill={primaryColor} stroke={secondaryColor} strokeWidth="1" />
                {/* Stripe */}
                <rect x="52" y="40" width="16" height="85" fill={secondaryColor} opacity="0.3" rx="2" />
                {/* Number / OVR */}
                <text
                  x="60" y="85"
                  textAnchor="middle"
                  fontSize="28"
                  fontWeight="900"
                  fill={secondaryColor}
                  style={{ textShadow: `0 2px 4px ${primaryColor}88` }}
                >
                  {playerOverall}
                </text>
                {/* Name on back */}
                <text
                  x="60" y="60"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill={secondaryColor}
                  letterSpacing="1"
                >
                  {playerName.split(' ').pop()?.toUpperCase().slice(0, 12)}
                </text>
              </svg>
            </div>

            {/* Player info */}
            <div className={`space-y-1 transition-all duration-500 delay-700 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <h3 className="text-lg font-black text-white drop-shadow">{playerName}</h3>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="outline" className="text-[10px] border-white/30 text-white/90">{playerPosition}</Badge>
                <Badge variant="outline" className="text-[10px] border-white/30 text-white/90">{playerAge} anos</Badge>
                <Badge className="text-[10px] bg-primary/80 text-primary-foreground gap-0.5">
                  <Star className="h-2.5 w-2.5" /> {playerOverall}
                </Badge>
              </div>
              <p className="text-xs text-white/60 mt-1">Novo reforço do <strong className="text-white/90">{clubName}</strong></p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
