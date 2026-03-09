#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class FiscalTaxCanarieAPITester:
    def __init__(self, base_url="https://tribute-models-docs.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.client_token = None
        self.commercialista_token = None
        self.client_user = None
        self.commercialista_user = None
        self.test_client_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = {}

    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {details}")
            self.failed_tests.append(f"{test_name}: {details}")
        
        self.test_results[test_name] = {
            "passed": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }

    def test_health_check(self):
        """Test basic API health"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200 and "Fiscal Tax Canarie" in response.text
            details = f"Status: {response.status_code}, Response: {response.text[:100]}"
            self.log_test("API Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("API Health Check", False, f"Connection error: {str(e)}")
            return False

    def test_user_registration(self, role="cliente"):
        """Test user registration for different roles"""
        timestamp = datetime.now().strftime("%H%M%S")
        test_data = {
            "email": f"test_{role}_{timestamp}@example.com",
            "password": "TestPass123!",
            "full_name": f"Test {role.title()} User",
            "phone": "+34 123 456 789",
            "role": role
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/register", json=test_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                token = data.get("access_token")
                user = data.get("user")
                
                if role == "cliente":
                    self.client_token = token
                    self.client_user = user
                    self.test_client_id = user.get("id")
                else:
                    self.commercialista_token = token
                    self.commercialista_user = user
                
                details = f"User ID: {user.get('id')}, Role: {user.get('role')}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test(f"User Registration ({role})", success, details)
            return success
            
        except Exception as e:
            self.log_test(f"User Registration ({role})", False, f"Error: {str(e)}")
            return False

    def test_user_login(self, role="cliente"):
        """Test user login"""
        if role == "cliente" and self.client_user:
            email = self.client_user["email"]
        elif role == "commercialista" and self.commercialista_user:
            email = self.commercialista_user["email"]
        else:
            self.log_test(f"User Login ({role})", False, "No user data available for login test")
            return False
        
        login_data = {
            "email": email,
            "password": "TestPass123!"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=login_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                token = data.get("access_token")
                user = data.get("user")
                details = f"Token received, User: {user.get('full_name')}, Role: {user.get('role')}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test(f"User Login ({role})", success, details)
            return success
            
        except Exception as e:
            self.log_test(f"User Login ({role})", False, f"Error: {str(e)}")
            return False

    def test_auth_me(self):
        """Test get current user endpoint"""
        if not self.client_token:
            self.log_test("Auth Me Endpoint", False, "No client token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.client_token}"}
        
        try:
            response = requests.get(f"{self.api_url}/auth/me", headers=headers, timeout=10)
            success = response.status_code == 200
            
            if success:
                user = response.json()
                details = f"User: {user.get('full_name')}, Role: {user.get('role')}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Auth Me Endpoint", success, details)
            return success
            
        except Exception as e:
            self.log_test("Auth Me Endpoint", False, f"Error: {str(e)}")
            return False

    def test_get_clients(self):
        """Test get clients endpoint (commercialista only)"""
        if not self.commercialista_token:
            self.log_test("Get Clients", False, "No commercialista token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.commercialista_token}"}
        
        try:
            response = requests.get(f"{self.api_url}/clients", headers=headers, timeout=10)
            success = response.status_code == 200
            
            if success:
                clients = response.json()
                details = f"Retrieved {len(clients)} clients"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Get Clients", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Clients", False, f"Error: {str(e)}")
            return False

    def test_get_client_detail(self):
        """Test get specific client endpoint"""
        if not self.commercialista_token or not self.test_client_id:
            self.log_test("Get Client Detail", False, "No commercialista token or client ID available")
            return False
            
        headers = {"Authorization": f"Bearer {self.commercialista_token}"}
        
        try:
            response = requests.get(f"{self.api_url}/clients/{self.test_client_id}", headers=headers, timeout=10)
            success = response.status_code == 200
            
            if success:
                client = response.json()
                details = f"Client: {client.get('full_name')}, Email: {client.get('email')}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Get Client Detail", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Client Detail", False, f"Error: {str(e)}")
            return False

    def test_get_deadlines(self):
        """Test get deadlines endpoint"""
        if not self.client_token:
            self.log_test("Get Deadlines", False, "No client token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.client_token}"}
        
        try:
            response = requests.get(f"{self.api_url}/deadlines", headers=headers, timeout=10)
            success = response.status_code == 200
            
            if success:
                deadlines = response.json()
                details = f"Retrieved {len(deadlines)} deadlines"
                # Check if default Canary Islands deadlines are created
                if len(deadlines) >= 10:
                    details += " (includes default fiscal deadlines)"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Get Deadlines", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Deadlines", False, f"Error: {str(e)}")
            return False

    def test_get_documents(self):
        """Test get documents endpoint"""
        if not self.client_token:
            self.log_test("Get Documents", False, "No client token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.client_token}"}
        
        try:
            response = requests.get(f"{self.api_url}/documents", headers=headers, timeout=10)
            success = response.status_code == 200
            
            if success:
                documents = response.json()
                details = f"Retrieved {len(documents)} documents"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Get Documents", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Documents", False, f"Error: {str(e)}")
            return False

    def test_get_payslips(self):
        """Test get payslips endpoint"""
        if not self.client_token:
            self.log_test("Get Payslips", False, "No client token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.client_token}"}
        
        try:
            response = requests.get(f"{self.api_url}/payslips", headers=headers, timeout=10)
            success = response.status_code == 200
            
            if success:
                payslips = response.json()
                details = f"Retrieved {len(payslips)} payslips"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Get Payslips", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Payslips", False, f"Error: {str(e)}")
            return False

    def test_get_notes(self):
        """Test get notes endpoint"""
        if not self.client_token:
            self.log_test("Get Notes", False, "No client token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.client_token}"}
        
        try:
            response = requests.get(f"{self.api_url}/notes", headers=headers, timeout=10)
            success = response.status_code == 200
            
            if success:
                notes = response.json()
                details = f"Retrieved {len(notes)} notes"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Get Notes", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Notes", False, f"Error: {str(e)}")
            return False

    def test_get_stats(self):
        """Test get stats endpoint for both client and commercialista"""
        # Test client stats
        if self.client_token:
            headers = {"Authorization": f"Bearer {self.client_token}"}
            try:
                response = requests.get(f"{self.api_url}/stats", headers=headers, timeout=10)
                success = response.status_code == 200
                
                if success:
                    stats = response.json()
                    expected_keys = ["documents_count", "payslips_count", "notes_count", "deadlines_count"]
                    has_keys = all(key in stats for key in expected_keys)
                    details = f"Client stats: {stats}" if has_keys else f"Missing keys in response: {stats}"
                else:
                    details = f"Status: {response.status_code}, Error: {response.text}"
                
                self.log_test("Get Stats (Client)", success and has_keys, details)
                
            except Exception as e:
                self.log_test("Get Stats (Client)", False, f"Error: {str(e)}")

        # Test commercialista stats
        if self.commercialista_token:
            headers = {"Authorization": f"Bearer {self.commercialista_token}"}
            try:
                response = requests.get(f"{self.api_url}/stats", headers=headers, timeout=10)
                success = response.status_code == 200
                
                if success:
                    stats = response.json()
                    expected_keys = ["clients_count", "documents_count", "payslips_count", "notes_count"]
                    has_keys = all(key in stats for key in expected_keys)
                    details = f"Commercialista stats: {stats}" if has_keys else f"Missing keys in response: {stats}"
                else:
                    details = f"Status: {response.status_code}, Error: {response.text}"
                
                self.log_test("Get Stats (Commercialista)", success and has_keys, details)
                
            except Exception as e:
                self.log_test("Get Stats (Commercialista)", False, f"Error: {str(e)}")

    def test_create_note(self):
        """Test creating a note (commercialista only)"""
        if not self.commercialista_token or not self.test_client_id:
            self.log_test("Create Note", False, "No commercialista token or client ID available")
            return False
            
        headers = {"Authorization": f"Bearer {self.commercialista_token}"}
        note_data = {
            "title": "Test Note",
            "content": "This is a test note for API testing.",
            "client_id": self.test_client_id,
            "is_internal": False
        }
        
        try:
            response = requests.post(f"{self.api_url}/notes", json=note_data, headers=headers, timeout=10)
            success = response.status_code == 200
            
            if success:
                note = response.json()
                details = f"Created note: {note.get('title')}, ID: {note.get('id')}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Create Note", success, details)
            return success
            
        except Exception as e:
            self.log_test("Create Note", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Fiscal Tax Canarie API Tests...")
        print(f"🌐 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Basic connectivity
        if not self.test_health_check():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # User management tests
        self.test_user_registration("cliente")
        self.test_user_registration("commercialista")
        self.test_user_login("cliente")
        self.test_user_login("commercialista")
        self.test_auth_me()
        
        # Data retrieval tests
        self.test_get_clients()
        self.test_get_client_detail()
        self.test_get_deadlines()
        self.test_get_documents()
        self.test_get_payslips()
        self.test_get_notes()
        self.test_get_stats()
        
        # Data creation tests
        self.test_create_note()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Tests failed: {len(self.failed_tests)}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ Failed tests:")
            for failure in self.failed_tests:
                print(f"   - {failure}")
        
        # Return success if more than 80% tests pass
        return (self.tests_passed / self.tests_run) >= 0.8

def main():
    """Main function"""
    tester = FiscalTaxCanarieAPITester()
    success = tester.run_all_tests()
    
    # Save results for later analysis
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "failed_tests": len(tester.failed_tests),
        "success_rate": (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0,
        "failures": tester.failed_tests,
        "detailed_results": tester.test_results
    }
    
    try:
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n💾 Results saved to /app/backend_test_results.json")
    except Exception as e:
        print(f"\n⚠️  Could not save results: {e}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())