import re
import os

migrations_dir = 'supabase/migrations'
files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

tables = {} # table_name -> {columns: [], policies: [], indexes: []}

def parse_sql(content):
    # This is a VERY crude parser
    # Find CREATE TABLE
    create_table_matches = re.finditer(r'CREATE TABLE (?:IF NOT EXISTS )?([\w.]+)\s*\((.*?)\);', content, re.DOTALL | re.IGNORECASE)
    for match in create_table_matches:
        table_name = match.group(1).strip()
        body = match.group(2).strip()
        tables[table_name] = {'body': body, 'policies': [], 'indexes': [], 'alters': []}

    # Find ALTER TABLE
    alter_table_matches = re.finditer(r'ALTER TABLE (?:IF NOT EXISTS )?([\w.]+)\s*(.*?);', content, re.DOTALL | re.IGNORECASE)
    for match in alter_table_matches:
        table_name = match.group(1).strip()
        action = match.group(2).strip()
        if table_name in tables:
            tables[table_name]['alters'].append(action)

    # Find CREATE POLICY
    policy_matches = re.finditer(r'CREATE POLICY "(.*?)" ON ([\w.]+)(.*?);', content, re.DOTALL | re.IGNORECASE)
    for match in policy_matches:
        name = match.group(1)
        table_name = match.group(2).strip()
        definition = match.group(3).strip()
        if table_name in tables:
            tables[table_name]['policies'].append(f'"{name}" {definition}')

for file in files:
    with open(os.path.join(migrations_dir, file), 'r') as f:
        parse_sql(f.read())

for table_name, data in tables.items():
    print(f"Table: {table_name}")
    # print(f"  Definition: {data['body'][:100]}...")
    if data['alters']:
        print(f"  Alters: {len(data['alters'])}")
    if data['policies']:
        print(f"  Policies: {len(data['policies'])}")
