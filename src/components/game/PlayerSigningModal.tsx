/**
 * PlayerSigningModal — Shows a celebratory modal when a player is bought,
 * with a signing background image, SVG jersey in team colors, and "ASSINADO" badge.
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Star } from 'lucide-react';
import signingBg from '@/assets/signing-bg.jpg';

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

  // Auto-close after 5 seconds
  useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0 bg-transparent shadow-2xl">
        <div className={`relative rounded-2xl overflow-hidden transition-all duration-700 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          {/* Background signing image */}
          <img src={signingBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          
          {/* Gradient overlay with team colors */}
          <div 
            className="absolute inset-0"
            style={{ background: `linear-gradient(160deg, ${primaryColor}dd 0%, hsl(220, 30%, 8%) 40%, ${primaryColor}44 100%)` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

          <div className="relative z-10 p-6 sm:p-8 flex flex-col items-center text-center gap-4">
            {/* ASSINADO badge */}
            <div className={`transition-all duration-500 delay-200 ${showContent ? 'translate-y-0 opacity-100' : '-translate-y-6 opacity-0'}`}>
              <Badge className="bg-emerald-500/90 text-white font-black text-sm px-5 py-1.5 shadow-lg shadow-emerald-500/20 border-0">
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> NOVO REFORÇO ✍️
              </Badge>
            </div>

            {/* Jersey SVG */}
            <div className={`transition-all duration-600 delay-400 ${showContent ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-75'}`}>
              <svg width="140" height="160" viewBox="0 0 120 140" className="drop-shadow-2xl" style={{ filter: `drop-shadow(0 0 20px ${primaryColor}44)` }}>
                {/* Jersey body */}
                <path
                  d="M30 35 L10 50 L10 130 L110 130 L110 50 L90 35 L80 25 Q60 15 40 25 Z"
                  fill={primaryColor}
                  stroke={secondaryColor}
                  strokeWidth="2.5"
                />
                {/* Collar */}
                <path
                  d="M40 25 Q60 20 80 25 Q70 35 60 35 Q50 35 40 25Z"
                  fill={secondaryColor}
                />
                {/* Sleeves */}
                <path d="M30 35 L10 50 L15 55 L35 42 Z" fill={primaryColor} stroke={secondaryColor} strokeWidth="1.5" />
                <path d="M90 35 L110 50 L105 55 L85 42 Z" fill={primaryColor} stroke={secondaryColor} strokeWidth="1.5" />
                {/* Vertical stripe */}
                <rect x="52" y="40" width="16" height="85" fill={secondaryColor} opacity="0.25" rx="3" />
                {/* OVR Number */}
                <text
                  x="60" y="90"
                  textAnchor="middle"
                  fontSize="32"
                  fontWeight="900"
                  fill={secondaryColor}
                  style={{ textShadow: `0 2px 8px ${primaryColor}88` }}
                >
                  {playerOverall}
                </text>
                {/* Name on back */}
                <text
                  x="60" y="58"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="800"
                  fill={secondaryColor}
                  letterSpacing="1.5"
                >
                  {playerName.split(' ').pop()?.toUpperCase().slice(0, 12)}
                </text>
              </svg>
            </div>

            {/* Player info */}
            <div className={`space-y-2 transition-all duration-500 delay-700 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <h3 className="text-xl font-black text-white drop-shadow-lg">{playerName}</h3>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] border-white/20 text-white/80 bg-white/5">{playerPosition}</Badge>
                <Badge variant="outline" className="text-[10px] border-white/20 text-white/80 bg-white/5">{playerAge} anos</Badge>
                <Badge className="text-[10px] bg-primary/80 text-primary-foreground gap-0.5">
                  <Star className="h-2.5 w-2.5" /> {playerOverall} OVR
                </Badge>
              </div>
              <p className="text-xs text-white/50 mt-2">
                Novo reforço do <strong className="text-white/80">{clubName}</strong>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
