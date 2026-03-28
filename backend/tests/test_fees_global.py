"""
Test suite for Global Fees Management (Onorari) endpoints
Tests: GET /api/fees/all, GET /api/fees/summary
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "info@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Triana48+"


class TestFeesGlobal:
    """Tests for global fees management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.token = token
        
        yield
        
        self.session.close()
    
    def test_login_success(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "commercialista"
        print("✅ Admin login successful")
    
    def test_get_fees_all_endpoint_exists(self):
        """Test GET /api/fees/all endpoint exists and returns 200"""
        response = self.session.get(f"{BASE_URL}/api/fees/all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/fees/all returns {len(data)} fees")
    
    def test_get_fees_summary_endpoint_exists(self):
        """Test GET /api/fees/summary endpoint exists and returns 200"""
        response = self.session.get(f"{BASE_URL}/api/fees/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify summary structure
        assert "total_pending" in data, "Missing total_pending in summary"
        assert "total_paid" in data, "Missing total_paid in summary"
        assert "total_overdue" in data, "Missing total_overdue in summary"
        assert "total_count" in data, "Missing total_count in summary"
        
        print(f"✅ GET /api/fees/summary returns: total_count={data['total_count']}, pending={data['total_pending']}, paid={data['total_paid']}, overdue={data['total_overdue']}")
    
    def test_fees_all_with_search_filter(self):
        """Test GET /api/fees/all with search parameter"""
        response = self.session.get(f"{BASE_URL}/api/fees/all?search=test")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/fees/all?search=test returns {len(data)} fees")
    
    def test_fees_all_with_status_filter(self):
        """Test GET /api/fees/all with status filter"""
        for status in ["pending", "paid", "overdue"]:
            response = self.session.get(f"{BASE_URL}/api/fees/all?status={status}")
            assert response.status_code == 200, f"Failed for status={status}"
            data = response.json()
            assert isinstance(data, list)
            # Verify all returned fees have the correct status
            for fee in data:
                assert fee.get("status") == status, f"Fee has wrong status: {fee.get('status')} != {status}"
            print(f"✅ GET /api/fees/all?status={status} returns {len(data)} fees")
    
    def test_fees_all_with_client_type_filter(self):
        """Test GET /api/fees/all with client_type filter"""
        for client_type in ["societa", "autonomo", "vivienda_vacacional", "persona_fisica"]:
            response = self.session.get(f"{BASE_URL}/api/fees/all?client_type={client_type}")
            assert response.status_code == 200, f"Failed for client_type={client_type}"
            data = response.json()
            assert isinstance(data, list)
            print(f"✅ GET /api/fees/all?client_type={client_type} returns {len(data)} fees")
    
    def test_fees_all_with_year_filter(self):
        """Test GET /api/fees/all with year filter"""
        current_year = datetime.now().year
        response = self.session.get(f"{BASE_URL}/api/fees/all?year={current_year}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/fees/all?year={current_year} returns {len(data)} fees")
    
    def test_fees_all_with_combined_filters(self):
        """Test GET /api/fees/all with multiple filters"""
        current_year = datetime.now().year
        response = self.session.get(f"{BASE_URL}/api/fees/all?status=pending&year={current_year}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/fees/all with combined filters returns {len(data)} fees")
    
    def test_fees_all_response_structure(self):
        """Test that fees in response have expected structure"""
        response = self.session.get(f"{BASE_URL}/api/fees/all")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            fee = data[0]
            # Check required fields
            assert "id" in fee, "Fee missing 'id'"
            assert "client_id" in fee, "Fee missing 'client_id'"
            assert "description" in fee, "Fee missing 'description'"
            assert "amount" in fee, "Fee missing 'amount'"
            assert "due_date" in fee, "Fee missing 'due_date'"
            assert "status" in fee, "Fee missing 'status'"
            # Check enriched fields
            assert "client_name" in fee, "Fee missing 'client_name'"
            assert "client_email" in fee, "Fee missing 'client_email'"
            assert "client_type" in fee, "Fee missing 'client_type'"
            print(f"✅ Fee structure is correct: {fee.get('description')[:30]}...")
        else:
            print("⚠️ No fees found to verify structure")
    
    def test_fees_summary_response_structure(self):
        """Test that summary has expected structure and valid values"""
        response = self.session.get(f"{BASE_URL}/api/fees/summary")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all values are numbers
        assert isinstance(data["total_pending"], (int, float)), "total_pending should be a number"
        assert isinstance(data["total_paid"], (int, float)), "total_paid should be a number"
        assert isinstance(data["total_overdue"], (int, float)), "total_overdue should be a number"
        assert isinstance(data["total_count"], int), "total_count should be an integer"
        
        # Verify values are non-negative
        assert data["total_pending"] >= 0, "total_pending should be non-negative"
        assert data["total_paid"] >= 0, "total_paid should be non-negative"
        assert data["total_overdue"] >= 0, "total_overdue should be non-negative"
        assert data["total_count"] >= 0, "total_count should be non-negative"
        
        print(f"✅ Summary structure and values are valid")
    
    def test_fees_unauthorized_access(self):
        """Test that fees endpoints require authentication"""
        # Create a new session without auth
        unauth_session = requests.Session()
        
        response = unauth_session.get(f"{BASE_URL}/api/fees/all")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        response = unauth_session.get(f"{BASE_URL}/api/fees/summary")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print("✅ Fees endpoints correctly require authentication")


class TestClientFees:
    """Tests for client-specific fees endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        self.session.close()
    
    def test_get_clients_list(self):
        """Test getting clients list to find a client for fee tests"""
        response = self.session.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200
        clients = response.json()
        assert isinstance(clients, list)
        print(f"✅ Found {len(clients)} clients")
        return clients
    
    def test_create_and_get_client_fee(self):
        """Test creating a fee for a client and retrieving it"""
        # Get a client first
        clients_response = self.session.get(f"{BASE_URL}/api/clients")
        if clients_response.status_code != 200:
            pytest.skip("Could not get clients list")
        
        clients = clients_response.json()
        if len(clients) == 0:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["id"]
        
        # Create a test fee
        fee_data = {
            "description": "TEST_Fee_Iteration19",
            "amount": 150.00,
            "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "status": "pending",
            "notes": "Test fee created by automated test"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/clients/{client_id}/fees", json=fee_data)
        assert create_response.status_code == 200, f"Failed to create fee: {create_response.text}"
        
        created_fee = create_response.json()
        assert created_fee["description"] == fee_data["description"]
        assert created_fee["amount"] == fee_data["amount"]
        assert created_fee["status"] == "pending"
        
        fee_id = created_fee["id"]
        print(f"✅ Created fee with ID: {fee_id}")
        
        # Verify fee appears in client fees list
        fees_response = self.session.get(f"{BASE_URL}/api/clients/{client_id}/fees")
        assert fees_response.status_code == 200
        fees = fees_response.json()
        fee_ids = [f["id"] for f in fees]
        assert fee_id in fee_ids, "Created fee not found in client fees list"
        print(f"✅ Fee appears in client fees list")
        
        # Verify fee appears in global fees list
        global_fees_response = self.session.get(f"{BASE_URL}/api/fees/all")
        assert global_fees_response.status_code == 200
        global_fees = global_fees_response.json()
        global_fee_ids = [f["id"] for f in global_fees]
        assert fee_id in global_fee_ids, "Created fee not found in global fees list"
        print(f"✅ Fee appears in global fees list")
        
        # Cleanup - delete the test fee
        delete_response = self.session.delete(f"{BASE_URL}/api/clients/{client_id}/fees/{fee_id}")
        assert delete_response.status_code == 200, f"Failed to delete test fee: {delete_response.text}"
        print(f"✅ Test fee cleaned up")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
