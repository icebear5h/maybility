"""
Debug script to check URL format
"""

import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
print(f"URL: '{url}'")
print(f"Length: {len(url)}")
print(f"Type: {type(url)}")

# Check if it looks like a Supabase URL
if url and url.startswith("https://") and ".supabase.co" in url:
    print("✅ URL format looks correct")
    
    # Try to validate it's a proper URL
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        print(f"   Domain: {parsed.netloc}")
        print(f"   Scheme: {parsed.scheme}")
        if parsed.netloc.endswith(".supabase.co"):
            print("✅ Domain looks like Supabase")
        else:
            print("❌ Domain doesn't end with .supabase.co")
    except Exception as e:
        print(f"❌ URL parsing error: {e}")
else:
    print("❌ URL format doesn't look like Supabase")
    print("   Expected: https://xxxxxxxxxxxxx.supabase.co")
