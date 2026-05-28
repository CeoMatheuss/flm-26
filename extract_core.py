import re
core_tables = [
    'public.profiles', 'public.clubs', 'public.league_members', 
    'public.multiplayer_leagues', 'public.chat_messages', 'public.trade_proposals',
    'public.world_players', 'public.world_teams', 'public.world_matches',
    'public.match_history'
]

with open('final_schema.sql', 'r') as f:
    content = f.read()
    
    # Extract types
    print("-- CUSTOM TYPES")
    for match in re.finditer(r'CREATE TYPE.*?;', content, re.DOTALL | re.IGNORECASE):
        print(match.group(0))
        print()

    sections = content.split('-- ==================== TABLE: ')
    for section in sections:
        table_name = section.split(' ')[0].strip().lower()
        if any(core in table_name for core in core_tables):
            print(f"-- ==================== TABLE: {section}")
