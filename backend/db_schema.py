import sqlite3
p = r'c:/Users/ikade/Downloads/New folder/cyber_guard.db'
conn = sqlite3.connect(p)
cur = conn.cursor()
cur.execute('PRAGMA table_info(scan_history)')
rows = cur.fetchall()
print(rows)
conn.close()
