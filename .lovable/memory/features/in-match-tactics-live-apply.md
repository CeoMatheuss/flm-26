---
name: In-Match Tactics Live Apply
description: Mudanças de tática durante a partida agora afetam a simulação em tempo real (auto-apply + refresh client-side dos eventos)
type: feature
---
A partida é pré-simulada no servidor (start-match) e os eventos ficam em live_matches.events; o cliente apenas revela ao longo do tempo via dataRef.current.allEvents. Para que ajustes táticos ao vivo funcionem:

1. LiveTacticsView faz **auto-apply com debounce 1.2s** ao alterar formação/playStyle/pressing/tempo/intensity/mentality/defensiveLine/marking (não precisa mais clicar no botão).
2. from_minute é o **currentMinute do cliente** (state.currentMinute), NÃO live_matches.current_minute (que fica em 0 até o apito final).
3. Após sucesso do re-simulate-from-minute, o hook chama refreshEvents() que: refaz select em live_matches, substitui dataRef.current.allEvents pelos novos eventos, mantém startTime intacto (não reinicia cronômetro) e reposiciona nextVisibleEventIdxRef pelo currentMinute.
4. Cooldown reduzido de 15min → 5min entre re-simulações (tactics.lastChangedAt).
5. notifiedEventsRef garante que eventos antigos não sejam re-emitidos; novos eventos têm chaves novas e passam normalmente.
