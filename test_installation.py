#!/usr/bin/env python3
"""
Test script to verify the Business Contact Scraper installation
Run this script to check if all dependencies and modules are working correctly
"""

import sys
import importlib

def test_imports():
    """Test if all required modules can be imported"""
    print("Testing module imports...")
    
    required_modules = [
        'requests',
        'bs4',
        'lxml',
        'fake_useragent',
        'psycopg2',
        'sqlite3',
        'dotenv'
    ]
    
    failed_imports = []
    
    for module in required_modules:
        try:
            importlib.import_module(module)
            print(f"✓ {module}")
        except ImportError as e:
            print(f"✗ {module}: {e}")
            failed_imports.append(module)
    
    if failed_imports:
        print(f"\nFailed to import {len(failed_imports)} modules:")
        for module in failed_imports:
            print(f"  - {module}")
        return False
    else:
        print("\nAll required modules imported successfully!")
        return True

def test_local_modules():
    """Test if local project modules can be imported"""
    print("\nTesting local module imports...")
    
    local_modules = [
        'config',
        'database',
        'utils',
        'scrapers.google_scraper',
        'scrapers.linkedin_scraper',
        'scrapers.yellowpages_scraper'
    ]
    
    failed_imports = []
    
    for module in local_modules:
        try:
            importlib.import_module(module)
            print(f"✓ {module}")
        except ImportError as e:
            print(f"✗ {module}: {e}")
            failed_imports.append(module)
    
    if failed_imports:
        print(f"\nFailed to import {len(failed_imports)} local modules:")
        for module in failed_imports:
            print(f"  - {module}")
        return False
    else:
        print("\nAll local modules imported successfully!")
        return True

def test_database_connection():
    """Test database connection"""
    print("\nTesting database connection...")
    
    try:
        from database import DatabaseManager
        
        # Test SQLite connection
        print("Testing SQLite connection...")
        db = DatabaseManager('sqlite')
        print("✓ SQLite connection successful")
        db.close()
        
        # Test PostgreSQL connection (if configured)
        try:
            print("Testing PostgreSQL connection...")
            db = DatabaseManager('postgresql')
            print("✓ PostgreSQL connection successful")
            db.close()
        except Exception as e:
            print(f"⚠ PostgreSQL connection failed (this is normal if not configured): {e}")
        
        return True
        
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False

def test_scrapers():
    """Test scraper initialization"""
    print("\nTesting scraper initialization...")
    
    try:
        from scrapers import GoogleScraper, LinkedInScraper, YellowPagesScraper
        
        # Test Google scraper
        google_scraper = GoogleScraper()
        print("✓ Google scraper initialized")
        
        # Test LinkedIn scraper
        linkedin_scraper = LinkedInScraper()
        print("✓ LinkedIn scraper initialized")
        
        # Test YellowPages scraper
        yellowpages_scraper = YellowPagesScraper()
        print("✓ YellowPages scraper initialized")
        
        return True
        
    except Exception as e:
        print(f"✗ Scraper initialization failed: {e}")
        return False

def test_utils():
    """Test utility functions"""
    print("\nTesting utility functions...")
    
    try:
        from utils import ScrapingUtils
        
        utils = ScrapingUtils()
        
        # Test user agent generation
        user_agent = utils.get_random_user_agent()
        print(f"✓ User agent generated: {user_agent[:50]}...")
        
        # Test text cleaning
        test_text = "  Test   Text  with  extra   spaces  "
        cleaned = utils.clean_text(test_text)
        print(f"✓ Text cleaning: '{cleaned}'")
        
        # Test email extraction
        test_email = "test@example.com"
        is_valid = utils.is_valid_email(test_email)
        print(f"✓ Email validation: {is_valid}")
        
        return True
        
    except Exception as e:
        print(f"✗ Utility functions test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("Business Contact Scraper - Installation Test")
    print("=" * 50)
    
    tests = [
        ("Module Imports", test_imports),
        ("Local Modules", test_local_modules),
        ("Database Connection", test_database_connection),
        ("Scrapers", test_scrapers),
        ("Utilities", test_utils)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        try:
            if test_func():
                passed += 1
        except Exception as e:
            print(f"✗ Test failed with exception: {e}")
    
    print("\n" + "=" * 50)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The scraper is ready to use.")
        print("\nYou can now run:")
        print("  python main.py 'technology companies'")
        print("  python example_usage.py")
    else:
        print("❌ Some tests failed. Please check the errors above.")
        print("\nCommon solutions:")
        print("  1. Install missing dependencies: pip install -r requirements.txt")
        print("  2. Check that all files are in the correct directory structure")
        print("  3. Verify Python version (3.7+)")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
