import requests
import sys
from datetime import datetime

class FiscalTaxCanarieAPITester:
    def __init__(self, base_url="https://tribute-models-docs.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_client_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")

            return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_predefined_accountant_login(self):
        """Test predefined accountant login with info@fiscaltaxcanarie.com / Triana48+"""
        success, response = self.run_test(
            "Predefined Accountant Login",
            "POST",
            "auth/login",
            200,
            data={"email": "info@fiscaltaxcanarie.com", "password": "Triana48+"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            user_role = response.get('user', {}).get('role')
            if user_role == 'commercialista':
                print(f"   ✅ Accountant role confirmed: {user_role}")
                return True
            else:
                print(f"   ❌ Wrong role: {user_role}")
                return False
        return False

    def test_client_registration_only(self):
        """Test that registration creates only client accounts"""
        test_email = f"test_client_{datetime.now().strftime('%H%M%S')}@example.com"
        success, response = self.run_test(
            "Client Registration (No Role Option)",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "TestPass123!",
                "full_name": "Test Client User",
                "phone": "+34 123456789",
                "codice_fiscale": "X1234567A"
            }
        )
        if success:
            user_role = response.get('user', {}).get('role')
            self.test_client_id = response.get('user', {}).get('id')
            if user_role == 'cliente':
                print(f"   ✅ Registration forced client role: {user_role}")
                return True
            else:
                print(f"   ❌ Wrong role assigned: {user_role}")
                return False
        return False

    def test_modelli_tributari_api(self):
        """Test API modelli-tributari returns 8 predefined models"""
        success, response = self.run_test(
            "Modelli Tributari API",
            "GET",
            "modelli-tributari",
            200
        )
        if success:
            models_count = len(response)
            print(f"   📊 Found {models_count} tax models")
            if models_count == 8:
                print(f"   ✅ Correct number of predefined models: {models_count}")
                # Check for key models
                model_codes = [m.get('codice') for m in response]
                expected_codes = ['Modelo-303', 'Modelo-111', 'IGIC', 'Modelo-200']
                found_codes = [code for code in expected_codes if code in model_codes]
                print(f"   📋 Key models found: {found_codes}")
                return models_count == 8
            else:
                print(f"   ❌ Expected 8 models, found {models_count}")
                return False
        return False

    def test_deadlines_with_states(self):
        """Test API scadenze with states (da_fare, in_lavorazione, completata, scaduta)"""
        success, response = self.run_test(
            "Deadlines API with States",
            "GET",
            "deadlines",
            200
        )
        if success:
            deadlines_count = len(response)
            print(f"   📊 Found {deadlines_count} deadlines")
            
            # Check status distribution
            status_counts = {}
            valid_statuses = {"da_fare", "in_lavorazione", "completata", "scaduta"}
            
            for deadline in response:
                status = deadline.get('status')
                if status in valid_statuses:
                    status_counts[status] = status_counts.get(status, 0) + 1
                else:
                    print(f"   ⚠️  Invalid status found: {status}")
            
            print(f"   📈 Status distribution: {status_counts}")
            
            if status_counts:
                print(f"   ✅ Valid deadline statuses found")
                return True
            else:
                print(f"   ❌ No valid deadline statuses found")
                return False
        return False

    def test_stats_api_commercialista(self):
        """Test stats API for commercialista shows deadline counts by status"""
        success, response = self.run_test(
            "Stats API (Commercialista)",
            "GET",
            "stats",
            200
        )
        if success:
            expected_fields = [
                'deadlines_da_fare', 'deadlines_in_lavorazione', 
                'deadlines_completate', 'deadlines_scadute'
            ]
            
            found_fields = []
            for field in expected_fields:
                if field in response:
                    found_fields.append(f"{field}: {response[field]}")
                
            if len(found_fields) == len(expected_fields):
                print(f"   ✅ All deadline status stats found:")
                for field_info in found_fields:
                    print(f"      • {field_info}")
                return True
            else:
                print(f"   ❌ Missing deadline status fields. Found: {found_fields}")
                return False
        return False

    def test_api_endpoints_health(self):
        """Test key API endpoints are accessible"""
        endpoints = [
            ("Root API", "", 200),
            ("Auth Me", "auth/me", 200),
            ("Clients List", "clients", 200),
            ("Documents", "documents", 200),
            ("Payslips", "payslips", 200),
            ("Notes", "notes", 200),
            ("Activity Logs", "activity-logs", 200)
        ]
        
        all_passed = True
        for name, endpoint, expected in endpoints:
            success, _ = self.run_test(name, "GET", endpoint, expected)
            if not success:
                all_passed = False
        
        return all_passed

def main():
    print("🚀 Starting Fiscal Tax Canarie API Testing...")
    print("=" * 60)
    
    tester = FiscalTaxCanarieAPITester()
    
    # Test sequence
    tests = [
        ("Predefined Accountant Login", tester.test_predefined_accountant_login),
        ("Client Registration Only", tester.test_client_registration_only),
        ("8 Predefined Tax Models", tester.test_modelli_tributari_api),
        ("Deadlines with States", tester.test_deadlines_with_states),
        ("Stats API (Deadline Counts)", tester.test_stats_api_commercialista),
        ("API Endpoints Health", tester.test_api_endpoints_health),
    ]
    
    for test_name, test_func in tests:
        try:
            success = test_func()
            if not success:
                print(f"⚠️  {test_name} had issues but continuing...")
        except Exception as e:
            print(f"❌ {test_name} failed with error: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 BACKEND TEST RESULTS:")
    print(f"   Tests run: {tester.tests_run}")
    print(f"   Tests passed: {tester.tests_passed}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    print("=" * 60)
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())