"""
Test suite for Fees (Onorari) functionality - Iteration 20
Tests GlobalFeesManagement and FeeManagement features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://app.fiscaltaxcanarie.com"

# Test credentials
ADMIN_EMAIL = "info@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Triana48+"


class TestFeesEndpoints:
    """Test fees-related API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_login_success(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "commercialista"
        print("✅ Login successful")
    
    def test_get_fees_all(self):
        """Test GET /api/fees/all endpoint"""
        response = requests.get(f"{BASE_URL}/api/fees/all", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/fees/all returned {len(data)} fees")
    
    def test_get_fees_summary(self):
        """Test GET /api/fees/summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/fees/summary", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_pending" in data
        assert "total_paid" in data
        assert "total_overdue" in data
        assert "total_count" in data
        print(f"✅ GET /api/fees/summary: pending={data['total_pending']}, paid={data['total_paid']}")
    
    def test_get_fees_by_client(self):
        """Test GET /api/fees/by-client endpoint"""
        response = requests.get(f"{BASE_URL}/api/fees/by-client", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Each item should have client info and fees
        if len(data) > 0:
            client = data[0]
            assert "id" in client
            assert "full_name" in client
            assert "fees" in client
            assert "fees_count" in client
        print(f"✅ GET /api/fees/by-client returned {len(data)} clients")
    
    def test_get_fees_export_excel(self):
        """Test GET /api/fees/export-excel endpoint"""
        response = requests.get(f"{BASE_URL}/api/fees/export-excel", headers=self.headers)
        assert response.status_code == 200
        # Should return Excel file
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "excel" in content_type or "octet-stream" in content_type
        print("✅ GET /api/fees/export-excel returns Excel file")
    
    def test_get_fees_export_excel_with_filters(self):
        """Test GET /api/fees/export-excel with category filter"""
        response = requests.get(
            f"{BASE_URL}/api/fees/export-excel?category=societa",
            headers=self.headers
        )
        assert response.status_code == 200
        print("✅ GET /api/fees/export-excel with category filter works")
    
    def test_get_fees_export_excel_with_fee_type_filter(self):
        """Test GET /api/fees/export-excel with fee_type filter"""
        response = requests.get(
            f"{BASE_URL}/api/fees/export-excel?fee_type=iguala",
            headers=self.headers
        )
        assert response.status_code == 200
        print("✅ GET /api/fees/export-excel with fee_type filter works")
    
    def test_get_clients(self):
        """Test GET /api/clients endpoint"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        self.clients = data
        print(f"✅ GET /api/clients returned {len(data)} clients")
        return data
    
    def test_get_client_fees(self):
        """Test GET /api/clients/{id}/fees endpoint"""
        # First get clients
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        clients = clients_response.json()
        
        if len(clients) > 0:
            client_id = clients[0]["id"]
            response = requests.get(f"{BASE_URL}/api/clients/{client_id}/fees", headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"✅ GET /api/clients/{client_id}/fees returned {len(data)} fees")
        else:
            pytest.skip("No clients available for testing")
    
    def test_get_client_fees_summary(self):
        """Test GET /api/clients/{id}/fees/summary endpoint"""
        # First get clients
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        clients = clients_response.json()
        
        if len(clients) > 0:
            client_id = clients[0]["id"]
            response = requests.get(f"{BASE_URL}/api/clients/{client_id}/fees/summary", headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert "total_pending" in data
            assert "total_paid" in data
            assert "total" in data
            print(f"✅ GET /api/clients/{client_id}/fees/summary works")
        else:
            pytest.skip("No clients available for testing")
    
    def test_create_fee_with_fee_type(self):
        """Test POST /api/clients/{id}/fees with fee_type field"""
        # First get clients
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        clients = clients_response.json()
        
        if len(clients) > 0:
            client_id = clients[0]["id"]
            
            # Create a fee with fee_type
            fee_data = {
                "description": "TEST_Consulenza Fiscale Test",
                "amount": 100.00,
                "fee_type": "consulenza",
                "status": "pending"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/clients/{client_id}/fees",
                json=fee_data,
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["fee_type"] == "consulenza"
            assert data["description"] == "TEST_Consulenza Fiscale Test"
            
            # Cleanup - delete the test fee
            fee_id = data["id"]
            delete_response = requests.delete(
                f"{BASE_URL}/api/clients/{client_id}/fees/{fee_id}",
                headers=self.headers
            )
            assert delete_response.status_code == 200
            
            print("✅ POST /api/clients/{id}/fees with fee_type works")
        else:
            pytest.skip("No clients available for testing")
    
    def test_create_iguala_fee(self):
        """Test creating an Iguala fee with recurring_month"""
        # First get clients
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        clients = clients_response.json()
        
        if len(clients) > 0:
            client_id = clients[0]["id"]
            
            # Create an Iguala fee
            fee_data = {
                "description": "TEST_Iguala Buste Paga Febbraio 2026",
                "amount": 200.00,
                "fee_type": "iguala_buste_paga",
                "is_recurring": True,
                "recurring_month": "2026-02",
                "status": "pending"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/clients/{client_id}/fees",
                json=fee_data,
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["fee_type"] == "iguala_buste_paga"
            assert data["is_recurring"] == True
            assert data["recurring_month"] == "2026-02"
            
            # Cleanup - delete the test fee
            fee_id = data["id"]
            delete_response = requests.delete(
                f"{BASE_URL}/api/clients/{client_id}/fees/{fee_id}",
                headers=self.headers
            )
            assert delete_response.status_code == 200
            
            print("✅ POST Iguala fee with recurring_month works")
        else:
            pytest.skip("No clients available for testing")
    
    def test_create_pratica_fee_with_due_date(self):
        """Test creating a Pratica/Procedura fee with due_date"""
        # First get clients
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        clients = clients_response.json()
        
        if len(clients) > 0:
            client_id = clients[0]["id"]
            
            # Create a Pratica fee with due_date
            fee_data = {
                "description": "TEST_Pratica Apertura Società",
                "amount": 500.00,
                "fee_type": "pratica",
                "due_date": "2026-04-15",
                "status": "pending"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/clients/{client_id}/fees",
                json=fee_data,
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["fee_type"] == "pratica"
            assert data["due_date"] == "2026-04-15"
            
            # Cleanup - delete the test fee
            fee_id = data["id"]
            delete_response = requests.delete(
                f"{BASE_URL}/api/clients/{client_id}/fees/{fee_id}",
                headers=self.headers
            )
            assert delete_response.status_code == 200
            
            print("✅ POST Pratica fee with due_date works")
        else:
            pytest.skip("No clients available for testing")
    
    def test_fees_all_filters(self):
        """Test /api/fees/all with various filters"""
        # Test with status filter
        response = requests.get(
            f"{BASE_URL}/api/fees/all?status=pending",
            headers=self.headers
        )
        assert response.status_code == 200
        print("✅ GET /api/fees/all?status=pending works")
        
        # Test with client_type filter
        response = requests.get(
            f"{BASE_URL}/api/fees/all?client_type=societa",
            headers=self.headers
        )
        assert response.status_code == 200
        print("✅ GET /api/fees/all?client_type=societa works")
        
        # Test with search filter
        response = requests.get(
            f"{BASE_URL}/api/fees/all?search=iguala",
            headers=self.headers
        )
        assert response.status_code == 200
        print("✅ GET /api/fees/all?search=iguala works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
