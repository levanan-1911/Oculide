import re

filepath = r"d:\Oculide\backend\database\submission_db.py"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Remove the extra columns from the SELECT statements
new_content = content.replace(", total_points, max_points, score_percentage", "")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Updated submission_db.py")
