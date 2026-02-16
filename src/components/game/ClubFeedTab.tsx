import { useState } from 'react';
import { FeedItem } from '@/types/feed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Newspaper, ThumbsUp, MessageCircle } from 'lucide-react';

interface Props {
  feedItems: FeedItem[];
  onReact: (itemId: string, emoji: string) => void;
}

const REACT_EMOJIS = ['👍', '🔥', '❤️', '👏', '😂', '😮', '👎', '😡'];

const typeColors: Record<string, string> = {
  transfer_in: 'border-l-blue-500 bg-blue-500/5',
  free_agent_signed: 'border-l-emerald-500 bg-emerald-500/5',
  stadium_upgrade: 'border-l-cyan-500 bg-cyan-500/5',
  facility_upgrade: 'border-l-purple-500 bg-purple-500/5',
  player_sold: 'border-l-orange-500 bg-orange-500/5',
  youth_promoted: 'border-l-yellow-500 bg-yellow-500/5',
  sponsor_signed: 'border-l-emerald-500 bg-emerald-500/5',
  season_end: 'border-l-amber-500 bg-amber-500/5',
};

const sentimentColors: Record<string, string> = {
  positive: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  neutral: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  negative: 'bg-red-500/10 border-red-500/30 text-red-400',
};

export function ClubFeedTab({ feedItems, onReact }: Props) {
  const [expandedReactions, setExpandedReactions] = useState<Set<string>>(new Set());

  const toggleReactionPanel = (id: string) => {
    setExpandedReactions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary" /> Feed do Clube
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Acompanhe as movimentações do seu clube e veja a reação da torcida!
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="space-y-2 p-3">
              {feedItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Nenhuma atividade ainda. Contrate jogadores, melhore o estádio e mais!
                </p>
              )}
              {feedItems.map(item => (
                <div key={item.id} className={`border-l-2 rounded-r-lg overflow-hidden ${typeColors[item.type] || 'border-l-border'}`}>
                  <div className="px-3 py-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          <span>{item.icon}</span> {item.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
                      </div>
                      <span className="text-[8px] text-muted-foreground whitespace-nowrap shrink-0">{timeAgo(item.timestamp)}</span>
                    </div>

                    {/* Player info badge */}
                    {item.playerData && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4">
                          {item.playerData.position}
                        </Badge>
                        <span className="text-[10px] font-medium">{item.playerData.name}</span>
                        <Badge className="text-[8px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-0">
                          OVR {item.playerData.overall}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">{item.playerData.age} anos</span>
                      </div>
                    )}

                    {/* Fan reaction */}
                    {item.fanReaction && (
                      <div className={`mt-2 px-2 py-1.5 rounded-lg border ${sentimentColors[item.fanReaction.sentiment]}`}>
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="h-3 w-3 shrink-0" />
                          <p className="text-[10px] font-medium">{item.fanReaction.message}</p>
                        </div>
                      </div>
                    )}

                    {/* Reactions */}
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {Object.entries(item.reactions)
                        .sort(([, a], [, b]) => b - a)
                        .map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => onReact(item.id, emoji)}
                            className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 transition-colors ${
                              item.userReaction === emoji
                                ? 'bg-primary/20 border-primary/50'
                                : 'bg-muted/30 border-border hover:bg-muted/50'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="font-medium">{count + (item.userReaction === emoji ? 1 : 0)}</span>
                          </button>
                        ))}
                      <button
                        onClick={() => toggleReactionPanel(item.id)}
                        className="p-0.5 rounded hover:bg-muted/50 transition-colors"
                      >
                        <ThumbsUp className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>

                    {/* Expanded reaction picker */}
                    {expandedReactions.has(item.id) && (
                      <div className="flex flex-wrap gap-1 mt-1.5 p-1.5 bg-muted/20 rounded-lg">
                        {REACT_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            className="text-base hover:scale-125 transition-transform p-0.5"
                            onClick={() => {
                              onReact(item.id, emoji);
                              toggleReactionPanel(item.id);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
