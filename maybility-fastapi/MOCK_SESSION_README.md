# Mock Session System for Testing

The `simple_test.py` script now includes a mock session system that simulates real user authentication.

## Features

- 🔐 **Login Simulation** - Enter email/password like a real app
- 🎫 **Real JWT Tokens** - Creates actual Supabase auth sessions
- 👤 **Multi-User Testing** - Test with different user accounts
- 🔒 **RLS Enforcement** - Tests Row Level Security policies
- 📋 **Session Info** - View current session details

## Quick Start

### 1. Create Test Users in Supabase

Go to your Supabase Dashboard:
1. Navigate to **Authentication > Users**
2. Click **"Add User"**
3. Create these accounts:

```
Email: test@example.com
Password: password123

Email: demo@example.com  
Password: demo123
```

### 2. Update User IDs

After creating users, copy their IDs from Supabase and update `MOCK_USERS` in `simple_test.py`:

```python
MOCK_USERS = {
    "test@example.com": {
        "password": "password123",
        "user_id": "abc123...",  # ← Paste real ID here
        "name": "Test User"
    },
    # ...
}
```

### 3. Run the Test Script

```bash
python simple_test.py
```

## Usage

### Login Flow

```
============================================================
  🔐 Mock Login System
============================================================

Available test accounts:
  • test@example.com / password123
  • demo@example.com / demo123
  • Type 'skip' to use anon key
  • Type 'setup' for setup instructions

Email: test@example.com
Password: ********

✓ Login successful! Welcome, Test User
  User ID: cmgmm7h8t0000vv3odxrsaah6

🔐 Creating authenticated session for test@example.com...
✓ Real JWT session created!

============================================================
  Session Active: User cmgmm7h8t0000vv3odxrsaah6
============================================================
```

### Commands

Once logged in, you can use these commands:

- **`session`** - Show current session info
- **`new`** - Start a new conversation thread
- **`quit`** - Exit the program

### Example Session

```
You: session

📋 Current Session:
  User ID: cmgmm7h8t0000vv3odxrsaah6
  Email: test@example.com
  Thread ID: 550e8400-e29b-41d4-a716-446655440000
  Auth: Real JWT

You: Schedule a meeting tomorrow at 2pm

Processing...
