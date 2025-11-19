import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database Configuration
DATABASE_CONFIG = {
    'postgresql': {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME', 'business_contacts'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', ''),
    },
    'sqlite': {
        'database': 'business_contacts.db'
    }
}

# Scraping Configuration
SCRAPING_CONFIG = {
    'delay_between_requests': 2,  # seconds
    'max_retries': 3,
    'timeout': 30,
    'max_results_per_source': 100
}

# Proxy Configuration
PROXY_CONFIG = {
    'use_proxies': False,
    'proxy_list': [
        # Add your proxy list here
        # 'http://proxy1:port',
        # 'http://proxy2:port',
    ]
}

# User Agent Configuration
USER_AGENT_CONFIG = {
    'use_rotating_agents': True,
    'custom_agents': [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ]
}

# Search Configuration
SEARCH_CONFIG = {
    'google_search_url': 'https://www.google.com/search',
    'linkedin_search_url': 'https://www.linkedin.com/search/results/companies',
    'yellowpages_search_url': 'https://www.yellowpages.com/search'
}
