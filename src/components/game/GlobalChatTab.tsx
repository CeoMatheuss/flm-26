import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Trash2, SmilePlus, ShieldAlert, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { containsProfanity, sanitizeMessage } from '@/utils/profanityFilter';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  userId: string;
  displayName: string;
  clubName: string;
}

interface GlobalMsg {
  id: string;
  user_id: string;
  sender_name: string;
  club_name: string;
  content: string;
  created_at: string;
}

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '⚽', '🏆', '👏', '💪'];

export function GlobalChatTab({ userId, displayName, clubName }: Props) {
  const [messages, setMessages] = useState<GlobalMsg[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMod, setIsMod] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const [msgRes, reactRes, adminRes, modRes, banRes] = await Promise.all([
        supabase.from('global_chat_messages').select('*').order('created_at', { ascending: true }).limit(100),
        supabase.from('global_chat_reactions' as any).select('*'),
        supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'moderator').maybeSingle(),
        supabase.from('chat_bans' as any).select('id').eq('user_id', userId).maybeSingle(),
      ]);
      if (msgRes.data) setMessages(msgRes.data as GlobalMsg[]);
      if (reactRes.data) setReactions(reactRes.data as unknown as Reaction[]);
      setIsAdmin(!!adminRes.data);
      setIsMod(!!modRes.data);
      setIsBanned(!!banRes.data);
    };
    load();

    const msgChannel = supabase
      .channel('global-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_chat_messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new as GlobalMsg].slice(-200));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'global_chat_messages' }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_chat_reactions' }, (payload) => {
        setReactions(prev => [...prev, payload.new as Reaction]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'global_chat_reactions' }, (payload) => {
        setReactions(prev => prev.filter(r => r.id !== (payload.old as any).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(msgChannel); };
  }, [userId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (isBanned) {
      toast.error('🚫 Você está banido do chat global!');
      return;
    }
    const msg = sanitizeMessage(input);
    if (!msg) return;
    if (containsProfanity(msg)) {
      toast.error('⚠️ Mensagem contém palavras proibidas!');
      return;
    }
    setSending(true);
    setInput('');
    const { error } = await supabase.from('global_chat_messages').insert([{
      user_id: userId,
      sender_name: displayName,
      club_name: clubName,
      content: msg,
    }]);
    if (error) toast.error('Erro ao enviar mensagem');
    setSending(false);
  };

  const deleteMessage = async (msgId: string) => {
    const { error } = await supabase.from('global_chat_messages').delete().eq('id', msgId);
    if (error) toast.error('Erro ao apagar mensagem');
  };

  const banUser = async (targetUserId: string, targetName: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('chat_bans' as any).insert([{
      user_id: targetUserId,
      banned_by: userId,
      reason: `Banido por admin`,
    }]);
    if (error) {
      if (error.code === '23505') {
        toast.info('Usuário já está banido.');
      } else {
        toast.error('Erro ao banir: ' + error.message);
      }
    } else {
      toast.success(`🚫 ${targetName} foi banido do chat global!`);
    }
  };

  const unbanUser = async (targetUserId: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('chat_bans' as any).delete().eq('user_id', targetUserId);
    if (error) toast.error('Erro ao desbanir');
    else toast.success('✅ Usuário desbanido!');
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === userId && r.emoji === emoji);
    if (existing) {
      await supabase.from('global_chat_reactions' as any).delete().eq('id', existing.id);
    } else {
      await supabase.from('global_chat_reactions' as any).insert([{ message_id: messageId, user_id: userId, emoji }]);
    }
  };

  const getMessageReactions = (messageId: string) => {
    const msgReactions = reactions.filter(r => r.message_id === messageId);
    const grouped: Record<string, { count: number; hasMyReaction: boolean }> = {};
    msgReactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, hasMyReaction: false };
      grouped[r.emoji].count++;
      if (r.user_id === userId) grouped[r.emoji].hasMyReaction = true;
    });
    return grouped;
  };

  const canDelete = isAdmin || isMod;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" /> Chat Global
            {(isAdmin || isMod) && (
              <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 border-red-500/30 text-red-400">
                <ShieldAlert className="h-2.5 w-2.5 mr-0.5" />
                {isAdmin ? 'ADMIN' : 'MOD'}
              </Badge>
            )}
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Converse com todos os managers do FLM 26. Xingamentos são proibidos.</p>
        </CardHeader>
        <CardContent className="p-0">
          {isBanned && (
            <div className="mx-3 mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" />
              <p className="text-xs text-destructive font-medium">Você está banido do chat global.</p>
            </div>
          )}
          <ScrollArea className="h-[400px] px-3">
            <div className="space-y-2 py-2">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma mensagem ainda. Seja o primeiro!</p>
              )}
              {messages.map(m => {
                const isMe = m.user_id === userId;
                const msgReactions = getMessageReactions(m.id);
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-1.5 ${isMe ? 'bg-primary/20' : 'bg-muted/50'} group relative`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold">{m.sender_name}</span>
                        {m.club_name && <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5">{m.club_name}</Badge>}
                      </div>
                      <p className="text-xs">{m.content}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[8px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="p-0.5 rounded hover:bg-background/50">
                                <SmilePlus className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2" side="top">
                              <div className="flex flex-wrap gap-1">
                                {EMOJI_OPTIONS.map(emoji => (
                                  <button
                                    key={emoji}
                                    className="text-lg hover:scale-125 transition-transform p-0.5"
                                    onClick={() => toggleReaction(m.id, emoji)}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          {(isMe || canDelete) && (
                            <button className="p-0.5 rounded hover:bg-destructive/20" onClick={() => deleteMessage(m.id)} title="Apagar mensagem">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          )}
                          {isAdmin && !isMe && (
                            <button
                              className="p-0.5 rounded hover:bg-destructive/20"
                              onClick={() => banUser(m.user_id, m.sender_name)}
                              title="Banir usuário do chat"
                            >
                              <Ban className="h-3 w-3 text-red-500" />
                            </button>
                          )}
                        </div>
                      </div>
                      {Object.keys(msgReactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(msgReactions).map(([emoji, data]) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(m.id, emoji)}
                              className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 transition-colors ${
                                data.hasMyReaction ? 'bg-primary/20 border-primary/50' : 'bg-muted/30 border-border hover:bg-muted/50'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="font-medium">{data.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
          <div className="border-t border-border p-2 flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={isBanned ? "Você está banido..." : "Digite sua mensagem..."}
              className="text-xs h-8"
              maxLength={500}
              disabled={isBanned}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            />
            <Button size="sm" className="h-8 px-3" onClick={sendMessage} disabled={sending || !input.trim() || isBanned}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
