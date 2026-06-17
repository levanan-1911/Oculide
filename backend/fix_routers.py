import os
import re

api_dir = r"d:\Oculide\backend\api"

for filename in os.listdir(api_dir):
    if filename.endswith(".py"):
        filepath = os.path.join(api_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Replace @router.get("/") with @router.get("")
        new_content = re.sub(r'@router\.(get|post|put|delete|patch)\(\"\/\*', r'@router.\1("', content)
        # Handle cases like @router.get("/", response_model=...)
        new_content = re.sub(r'@router\.(get|post|put|delete|patch)\(\"\/"', r'@router.\1(""', content)
        new_content = re.sub(r'@router\.(get|post|put|delete|patch)\("\/",', r'@router.\1("",', content)
        new_content = re.sub(r'@router\.(get|post|put|delete|patch)\("\/"\)', r'@router.\1("")', content)
        
        if new_content != content:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated {filename}")
