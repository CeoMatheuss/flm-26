import re
import os

migrations_dir = 'supabase/migrations'
files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

table_sql = {} # table_name -> list of SQL statements
other_sql = [] # Functions, triggers, etc.

# Regex to catch table names from CREATE/ALTER/POLICY/INDEX
table_regex = re.compile(r'\b(?:TABLE|POLICY|INDEX|TRIGGER|ON)\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w.]+)', re.IGNORECASE)

def extract_statements(content):
    # Split by semicolon, but be careful with functions (which have semicolons inside $$ blocks)
    # This is a very basic splitter.
    statements = []
    current = []
    in_dollar = False
    for line in content.splitlines():
        if '$$' in line:
            in_dollar = not in_dollar
        current.append(line)
        if not in_dollar and line.strip().endswith(';'):
            statements.append('\n'.join(current))
            current = []
    return statements

for file in files:
    with open(os.path.join(migrations_dir, file), 'r') as f:
        content = f.read()
        statements = extract_statements(content)
        for stmt in statements:
            stmt = stmt.strip()
            if not stmt: continue
            
            # Identify if it's related to a table
            match = table_regex.search(stmt)
            if match and 'public.' in match.group(1).lower():
                table_name = match.group(1).lower()
                if table_name not in table_sql:
                    table_sql[table_name] = []
                table_sql[table_name].append(stmt)
            elif 'CREATE TABLE' in stmt.upper():
                # Catch tables without public. prefix
                m = re.search(r'CREATE TABLE (?:IF NOT EXISTS )?([\w.]+)', stmt, re.IGNORECASE)
                if m:
                    table_name = m.group(1).lower()
                    if table_name not in table_sql:
                        table_sql[table_name] = []
                    table_sql[table_name].append(stmt)
                else:
                    other_sql.append(stmt)
            else:
                other_sql.append(stmt)

# Output grouped
print("-- CONSOLIDATED SCHEMA")
for table in sorted(table_sql.keys()):
    if table.startswith('auth.'): continue # Skip auth
    print(f"\n-- {'='*20} TABLE: {table} {'='*20}")
    for stmt in table_sql[table]:
        print(stmt)
        print()

print("\n-- {'='*20} OTHER (FUNCTIONS, TRIGGERS, ETC.) {'='*20}")
for stmt in other_sql:
    print(stmt)
    print()
