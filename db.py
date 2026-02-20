import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import json

load_dotenv()

def get_db_connection():
    """Create and return a database connection"""
    try:
        conn = psycopg2.connect(
            dbname=os.getenv('DB_NAME', 'restaurant_pos'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'postgres'),
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            cursor_factory=RealDictCursor
        )
        print("✅ Database connection successful!")
        return conn
    except Exception as e:
        print(f"⚠️ Database connection failed: {e}")
        print("⚠️ Running in demo mode with mock data")
        return None

def test_connection():
    """Test if we can connect to the database"""
    conn = get_db_connection()
    if conn:
        print("✅ Successfully connected to PostgreSQL!")
        conn.close()
        return True
    else:
        print("⚠️ Running in demo mode (no database connection)")
        return False

if __name__ == "__main__":
    test_connection()