"""
Test suite for Supabase connection and authentication
Run this to verify your Supabase setup is working correctly

Usage:
    python3 test_supabase_connection.py
"""

import os
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

def test_env_variables():
    """Test 1: Verify all required environment variables are present"""
    print("\n=== Test 1: Environment Variables ===")
    
    required_vars = {
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_ANON_KEY": os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY"),
        "SUPABASE_SERVICE_KEY": os.getenv("SUPABASE_SERVICE_KEY"),
    }
    
    all_present = True
    for var_name, var_value in required_vars.items():
        if var_value:
            print(f"✅ {var_name}: Set (length: {len(var_value)})")
        else:
            print(f"❌ {var_name}: NOT SET")
            all_present = False
    
    return all_present

def test_basic_connection():
    """Test 2: Test basic connection with anon key"""
    print("\n=== Test 2: Basic Connection (Anon Key) ===")
    
    try:
        url = os.getenv("SUPABASE_URL")
        anon_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
        
        if not url or not anon_key:
            print("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY")
            return False
        
        client = create_client(url, anon_key)
        print("✅ Supabase client created successfully")
        print(f"   URL: {url}")
        return True
    except Exception as e:
        print(f"❌ Failed to create client: {str(e)}")
        return False

def test_service_key_connection():
    """Test 3: Test connection with service key (bypasses RLS)"""
    print("\n=== Test 3: Service Key Connection ===")
    
    try:
        url = os.getenv("SUPABASE_URL")
        service_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not url or not service_key:
            print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
            return False, None
        
        client = create_client(url, service_key)
        print("✅ Service key client created successfully")
        return True, client
    except Exception as e:
        print(f"❌ Failed to create service key client: {str(e)}")
        return False, None

def test_tables_exist(client):
    """Test 4: Check if required tables exist"""
    print("\n=== Test 4: Table Existence ===")
    
    tables_to_check = ["tasks", "users"]
    results = {}
    
    for table in tables_to_check:
        try:
            # Try to query the table (limit 0 to just check existence)
            result = client.table(table).select("*").limit(0).execute()
            print(f"✅ Table '{table}' exists")
            results[table] = True
        except Exception as e:
            print(f"❌ Table '{table}' error: {str(e)}")
            results[table] = False
    
    return results

def test_create_test_user(client):
    """Test 5: Create a test user (using service key)"""
    print("\n=== Test 5: Create Test User ===")
    
    try:
        import uuid
        test_user = {
            "id": str(uuid.uuid4()),
            "email": f"test_{datetime.now().timestamp()}@example.com",
            "name": "Test User",
            "timezone": "UTC"
        }
        
        result = client.table("users").insert(test_user).execute()
        
        if result.data and len(result.data) > 0:
            user_id = result.data[0].get("id")
            print(f"✅ Test user created successfully")
            print(f"   User ID: {user_id}")
            print(f"   Email: {test_user['email']}")
            return True, user_id
        else:
            print(f"❌ Failed to create test user: {result}")
            return False, None
    except Exception as e:
        print(f"❌ Error creating test user: {str(e)}")
        return False, None

def test_create_task_with_service_key(client, user_id):
    """Test 6: Create a task using service key"""
    print("\n=== Test 6: Create Task (Service Key) ===")
    
    try:
        test_task = {
            "title": "Test Task",
            "description": "Testing Supabase connection",
            "priority": "MEDIUM",
            "status": "TODO",
            "color": "#3b82f6",
            "userId": user_id  # Note: might be user_id depending on schema
        }
        
        result = client.table("tasks").insert(test_task).execute()
        
        if result.data and len(result.data) > 0:
            task_id = result.data[0].get("id")
            print(f"✅ Task created successfully")
            print(f"   Task ID: {task_id}")
            print(f"   Title: {test_task['title']}")
            return True, task_id
        else:
            print(f"❌ Failed to create task: {result}")
            return False, None
    except Exception as e:
        print(f"❌ Error creating task: {str(e)}")
        print(f"   Hint: Check if column name is 'userId' or 'user_id'")
        return False, None

def test_query_tasks(client, user_id):
    """Test 7: Query tasks"""
    print("\n=== Test 7: Query Tasks ===")
    
    try:
        result = client.table("tasks").select("*").limit(5).execute()
        
        print(f"✅ Query successful, found {len(result.data)} tasks")
        if result.data:
            for i, task in enumerate(result.data[:3], 1):
                print(f"   Task {i}: {task.get('title', 'N/A')}")
        return True
    except Exception as e:
        print(f"❌ Error querying tasks: {str(e)}")
        return False

def test_user_auth_simulation():
    """Test 8: Simulate user authentication"""
    print("\n=== Test 8: User Authentication Simulation ===")
    print("ℹ️  To test with user JWT:")
    print("   1. Go to your Supabase dashboard → Authentication → Users")
    print("   2. Create a test user or use existing user")
    print("   3. Get the user's JWT token")
    print("   4. Add to .env: SUPABASE_USER_JWT=<your_jwt_token>")
    print("   5. Use: client.postgrest.auth(access_token)")
    
    user_jwt = os.getenv("SUPABASE_USER_JWT")
    if user_jwt:
        try:
            url = os.getenv("SUPABASE_URL")
            anon_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
            client = create_client(url, anon_key)
            
            # Attach JWT
            client.postgrest.auth(user_jwt)
            
            # Try to query tasks with user context
            result = client.table("tasks").select("*").limit(5).execute()
            print(f"✅ Authenticated query successful, found {len(result.data)} tasks")
            return True
        except Exception as e:
            print(f"❌ Error with user JWT: {str(e)}")
            return False
    else:
        print("⚠️  SUPABASE_USER_JWT not set - skipping user auth test")
        return None

def cleanup_test_data(client, task_ids=None, user_ids=None):
    """Clean up test data"""
    print("\n=== Cleanup Test Data ===")
    
    try:
        if task_ids:
            for task_id in task_ids:
                client.table("tasks").delete().eq("id", task_id).execute()
                print(f"✅ Deleted test task: {task_id}")
        
        if user_ids:
            for user_id in user_ids:
                client.table("users").delete().eq("id", user_id).execute()
                print(f"✅ Deleted test user: {user_id}")
        
        return True
    except Exception as e:
        print(f"⚠️  Cleanup warning: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("  SUPABASE CONNECTION TEST SUITE")
    print("=" * 60)
    
    # Store test data IDs for cleanup
    task_ids = []
    user_ids = []
    
    # Test 1: Environment variables
    if not test_env_variables():
        print("\n❌ FAILED: Missing required environment variables")
        print("\nRequired in .env file:")
        print("  SUPABASE_URL=https://your-project.supabase.co")
        print("  SUPABASE_ANON_KEY=your-anon-key")
        print("  SUPABASE_SERVICE_KEY=your-service-key")
        return
    
    # Test 2: Basic connection
    if not test_basic_connection():
        print("\n❌ FAILED: Cannot establish basic connection")
        return
    
    # Test 3: Service key connection
    service_ok, service_client = test_service_key_connection()
    if not service_ok:
        print("\n❌ FAILED: Cannot connect with service key")
        return
    
    # Test 4: Check tables
    tables = test_tables_exist(service_client)
    if not all(tables.values()):
        print("\n⚠️  WARNING: Some tables are missing")
        print("   You may need to run the schema.sql to create tables")
    
    # Test 5: Create test user
    user_created, user_id = test_create_test_user(service_client)
    if user_created and user_id:
        user_ids.append(user_id)
        
        # Test 6: Create task
        task_created, task_id = test_create_task_with_service_key(service_client, user_id)
        if task_created and task_id:
            task_ids.append(task_id)
    
    # Test 7: Query tasks
    test_query_tasks(service_client, user_id if user_created else None)
    
    # Test 8: User authentication
    test_user_auth_simulation()
    
    # Cleanup
    cleanup_test_data(service_client, task_ids, user_ids)
    
    # Final summary
    print("\n" + "=" * 60)
    print("  TEST SUMMARY")
    print("=" * 60)
    print("✅ Basic connection tests completed")
    print("ℹ️  For full functionality, you need:")
    print("   1. User authentication (JWT token)")
    print("   2. Proper Row Level Security (RLS) policies")
    print("   3. User ID associated with tasks")
    print("\n📚 Next steps:")
    print("   1. Create a user in Supabase Auth")
    print("   2. Get the user's JWT token")
    print("   3. Update your agent code to use user-specific queries")
    print("=" * 60)

if __name__ == "__main__":
    main()
