import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { containsProfanity, sanitizeMessage } from '@/utils/profanityFilter';

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

export function GlobalChatTab({ userId, displayName, clubName }: Props) {
  const [messages, setMessages] = useState<GlobalMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('global_chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      if (data) setMessages(data as GlobalMsg[]);
    };
    load();

    const channel = supabase
      .channel('global-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_chat_messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new as GlobalMsg].slice(-200));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
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

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" /> Chat Global
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Converse com todos os managers do FLM 26. Xingamentos são proibidos.</p>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] px-3">
            <div className="space-y-2 py-2">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma mensagem ainda. Seja o primeiro!</p>
              )}
              {messages.map(m => {
                const isMe = m.user_id === userId;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-1.5 ${isMe ? 'bg-primary/20' : 'bg-muted/50'}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold">{m.sender_name}</span>
                        {m.club_name && <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5">{m.club_name}</Badge>}
                      </div>
                      <p className="text-xs">{m.content}</p>
                      <span className="text-[8px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
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
              placeholder="Digite sua mensagem..."
              className="text-xs h-8"
              maxLength={500}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            />
            <Button size="sm" className="h-8 px-3" onClick={sendMessage} disabled={sending || !input.trim()}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
