"""
Test suite for Client-specific Fee Management (Onorari) - Iteration 33
Tests the FeeManagement component functionality in client detail view:
- Fee creation with IVA/IGIC tax types
- Net/Tax/Gross calculation
- Recurring status
- Reference month/year
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"

# Known client ID from previous tests
TEST_CLIENT_ID = "4823240b-c633-48c6-916e-b62636aacfe8"  # francesco de liso


class TestClientFeesAuthentication:
    """Test authentication for fee endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_login_admin(self):
        """Test admin login with provided credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data.get("user", {}).get("email") == ADMIN_EMAIL
        print(f"✓ Admin login successful: {ADMIN_EMAIL}")


class TestClientFeesCRUD:
    """Test CRUD operations for client-specific fees with IVA/IGIC support"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_get_client_fees(self):
        """Test GET /api/clients/{id}/fees - retrieve client fees"""
        response = self.session.get(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees")
        assert response.status_code == 200, f"Failed to get fees: {response.text}"
        fees = response.json()
        assert isinstance(fees, list), "Response should be a list"
        print(f"✓ Retrieved {len(fees)} fees for client")
        
        # Check if any fee has IVA/IGIC fields
        for fee in fees:
            if fee.get("tax_type"):
                print(f"  - Fee '{fee.get('description')}': tax_type={fee.get('tax_type')}, gross={fee.get('gross_amount')}")
    
    def test_get_client_fees_summary(self):
        """Test GET /api/clients/{id}/fees/summary - retrieve fee summary"""
        response = self.session.get(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees/summary")
        assert response.status_code == 200, f"Failed to get summary: {response.text}"
        summary = response.json()
        
        # Verify summary structure
        assert "total" in summary, "Missing 'total' in summary"
        assert "total_paid" in summary, "Missing 'total_paid' in summary"
        assert "total_pending" in summary, "Missing 'total_pending' in summary"
        assert "count_total" in summary, "Missing 'count_total' in summary"
        
        print(f"✓ Fee summary: total={summary.get('total')}, paid={summary.get('total_paid')}, pending={summary.get('total_pending')}, count={summary.get('count_total')}")
    
    def test_create_fee_with_igic_7(self):
        """Test POST /api/clients/{id}/fees - create fee with IGIC 7%"""
        fee_data = {
            "description": f"TEST_IGIC7_Consulenza_{uuid.uuid4().hex[:8]}",
            "amount": 100.00,
            "fee_type": "consulenza",
            "status": "pending",
            "tax_type": "IGIC_7",
            "reference_month": 1,
            "reference_year": 2026,
            "is_recurring": False,
            "notes": "Test fee with IGIC 7%"
        }
        
        response = self.session.post(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees", json=fee_data)
        assert response.status_code == 200, f"Failed to create fee: {response.text}"
        
        created_fee = response.json()
        
        # Verify tax calculation: 100 * 0.07 = 7, gross = 107
        assert created_fee.get("tax_type") == "IGIC_7", f"Wrong tax_type: {created_fee.get('tax_type')}"
        assert created_fee.get("net_amount") == 100.00, f"Wrong net_amount: {created_fee.get('net_amount')}"
        assert created_fee.get("tax_amount") == 7.00, f"Wrong tax_amount: {created_fee.get('tax_amount')}"
        assert created_fee.get("gross_amount") == 107.00, f"Wrong gross_amount: {created_fee.get('gross_amount')}"
        assert created_fee.get("reference_month") == 1, f"Wrong reference_month: {created_fee.get('reference_month')}"
        assert created_fee.get("reference_year") == 2026, f"Wrong reference_year: {created_fee.get('reference_year')}"
        
        print(f"✓ Created fee with IGIC 7%: net=100, tax=7, gross=107")
        
        # Cleanup
        fee_id = created_fee.get("id")
        if fee_id:
            self.session.delete(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees/{fee_id}")
    
    def test_create_fee_with_iva_21(self):
        """Test POST /api/clients/{id}/fees - create fee with IVA 21%"""
        fee_data = {
            "description": f"TEST_IVA21_Pratica_{uuid.uuid4().hex[:8]}",
            "amount": 200.00,
            "fee_type": "pratica",
            "status": "pending",
            "tax_type": "IVA_21",
            "due_date": "2026-02-28",
            "reference_month": 2,
            "reference_year": 2026,
            "is_recurring": False,
            "notes": "Test fee with IVA 21%"
        }
        
        response = self.session.post(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees", json=fee_data)
        assert response.status_code == 200, f"Failed to create fee: {response.text}"
        
        created_fee = response.json()
        
        # Verify tax calculation: 200 * 0.21 = 42, gross = 242
        assert created_fee.get("tax_type") == "IVA_21", f"Wrong tax_type: {created_fee.get('tax_type')}"
        assert created_fee.get("net_amount") == 200.00, f"Wrong net_amount: {created_fee.get('net_amount')}"
        assert created_fee.get("tax_amount") == 42.00, f"Wrong tax_amount: {created_fee.get('tax_amount')}"
        assert created_fee.get("gross_amount") == 242.00, f"Wrong gross_amount: {created_fee.get('gross_amount')}"
        
        print(f"✓ Created fee with IVA 21%: net=200, tax=42, gross=242")
        
        # Cleanup
        fee_id = created_fee.get("id")
        if fee_id:
            self.session.delete(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees/{fee_id}")
    
    def test_create_fee_with_iva_22(self):
        """Test POST /api/clients/{id}/fees - create fee with IVA 22%"""
        fee_data = {
            "description": f"TEST_IVA22_Dichiarazione_{uuid.uuid4().hex[:8]}",
            "amount": 500.00,
            "fee_type": "dichiarazione",
            "status": "pending",
            "tax_type": "IVA_22",
            "due_date": "2026-03-31",
            "reference_month": 3,
            "reference_year": 2026,
            "is_recurring": False,
            "notes": "Test fee with IVA 22%"
        }
        
        response = self.session.post(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees", json=fee_data)
        assert response.status_code == 200, f"Failed to create fee: {response.text}"
        
        created_fee = response.json()
        
        # Verify tax calculation: 500 * 0.22 = 110, gross = 610
        assert created_fee.get("tax_type") == "IVA_22", f"Wrong tax_type: {created_fee.get('tax_type')}"
        assert created_fee.get("net_amount") == 500.00, f"Wrong net_amount: {created_fee.get('net_amount')}"
        assert created_fee.get("tax_amount") == 110.00, f"Wrong tax_amount: {created_fee.get('tax_amount')}"
        assert created_fee.get("gross_amount") == 610.00, f"Wrong gross_amount: {created_fee.get('gross_amount')}"
        
        print(f"✓ Created fee with IVA 22%: net=500, tax=110, gross=610")
        
        # Cleanup
        fee_id = created_fee.get("id")
        if fee_id:
            self.session.delete(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees/{fee_id}")
    
    def test_create_fee_esente(self):
        """Test POST /api/clients/{id}/fees - create fee with ESENTE (0%)"""
        fee_data = {
            "description": f"TEST_ESENTE_Standard_{uuid.uuid4().hex[:8]}",
            "amount": 150.00,
            "fee_type": "standard",
            "status": "pending",
            "tax_type": "ESENTE",
            "reference_month": 1,
            "reference_year": 2026,
            "is_recurring": False,
            "notes": "Test fee exempt from tax"
        }
        
        response = self.session.post(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees", json=fee_data)
        assert response.status_code == 200, f"Failed to create fee: {response.text}"
        
        created_fee = response.json()
        
        # Verify tax calculation: 150 * 0 = 0, gross = 150
        assert created_fee.get("tax_type") == "ESENTE", f"Wrong tax_type: {created_fee.get('tax_type')}"
        assert created_fee.get("net_amount") == 150.00, f"Wrong net_amount: {created_fee.get('net_amount')}"
        assert created_fee.get("tax_amount") == 0.00, f"Wrong tax_amount: {created_fee.get('tax_amount')}"
        assert created_fee.get("gross_amount") == 150.00, f"Wrong gross_amount: {created_fee.get('gross_amount')}"
        
        print(f"✓ Created fee ESENTE: net=150, tax=0, gross=150")
        
        # Cleanup
        fee_id = created_fee.get("id")
        if fee_id:
            self.session.delete(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees/{fee_id}")
    
    def test_create_recurring_fee(self):
        """Test POST /api/clients/{id}/fees - create recurring fee (Iguala)"""
        fee_data = {
            "description": f"TEST_Iguala_Contabilita_{uuid.uuid4().hex[:8]}",
            "amount": 300.00,
            "fee_type": "iguala_contabilita",
            "status": "recurring",
            "tax_type": "IGIC_7",
            "reference_month": 1,
            "reference_year": 2026,
            "is_recurring": True,
            "recurring_frequency": "monthly",
            "notes": "Test recurring fee (Iguala)"
        }
        
        response = self.session.post(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees", json=fee_data)
        assert response.status_code == 200, f"Failed to create fee: {response.text}"
        
        created_fee = response.json()
        
        # Verify recurring fields
        assert created_fee.get("is_recurring") == True, f"is_recurring should be True"
        assert created_fee.get("status") == "recurring", f"Status should be 'recurring'"
        assert created_fee.get("fee_type") == "iguala_contabilita", f"Wrong fee_type"
        
        # Verify tax calculation: 300 * 0.07 = 21, gross = 321
        assert created_fee.get("gross_amount") == 321.00, f"Wrong gross_amount: {created_fee.get('gross_amount')}"
        
        print(f"✓ Created recurring fee (Iguala): is_recurring=True, status=recurring, gross=321")
        
        # Cleanup
        fee_id = created_fee.get("id")
        if fee_id:
            self.session.delete(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees/{fee_id}")
    
    def test_update_fee_status_to_paid(self):
        """Test PUT /api/clients/{id}/fees/{fee_id} - mark fee as paid"""
        # First create a fee
        fee_data = {
            "description": f"TEST_ToPay_{uuid.uuid4().hex[:8]}",
            "amount": 100.00,
            "fee_type": "standard",
            "status": "pending",
            "tax_type": "ESENTE",
            "reference_month": 1,
            "reference_year": 2026
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees", json=fee_data)
        assert create_response.status_code == 200, f"Failed to create fee: {create_response.text}"
        
        fee_id = create_response.json().get("id")
        
        # Update to paid
        update_response = self.session.put(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees/{fee_id}", json={
            "status": "paid"
        })
        assert update_response.status_code == 200, f"Failed to update fee: {update_response.text}"
        
        updated_fee = update_response.json()
        assert updated_fee.get("status") == "paid", f"Status should be 'paid'"
        assert updated_fee.get("paid_date") is not None, "paid_date should be set"
        
        print(f"✓ Updated fee status to paid, paid_date set automatically")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees/{fee_id}")
    
    def test_delete_fee(self):
        """Test DELETE /api/clients/{id}/fees/{fee_id} - delete fee"""
        # First create a fee
        fee_data = {
            "description": f"TEST_ToDelete_{uuid.uuid4().hex[:8]}",
            "amount": 50.00,
            "fee_type": "standard",
            "status": "pending",
            "tax_type": "ESENTE",
            "reference_month": 1,
            "reference_year": 2026
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees", json=fee_data)
        assert create_response.status_code == 200, f"Failed to create fee: {create_response.text}"
        
        fee_id = create_response.json().get("id")
        
        # Delete
        delete_response = self.session.delete(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees/{fee_id}")
        assert delete_response.status_code == 200, f"Failed to delete fee: {delete_response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/fees")
        fees = get_response.json()
        fee_ids = [f.get("id") for f in fees]
        assert fee_id not in fee_ids, "Fee should be deleted"
        
        print(f"✓ Fee deleted successfully")


class TestFeeTypes:
    """Test fee types endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_get_fee_types(self):
        """Test GET /api/fees/fee-types - retrieve fee types"""
        response = self.session.get(f"{BASE_URL}/api/fees/fee-types")
        assert response.status_code == 200, f"Failed to get fee types: {response.text}"
        
        fee_types = response.json()
        assert isinstance(fee_types, list), "Response should be a list"
        assert len(fee_types) > 0, "Should have at least one fee type"
        
        # Check expected fee types exist
        type_ids = [ft.get("id") for ft in fee_types]
        expected_types = ["standard", "consulenza", "pratica", "dichiarazione", "iguala_buste_paga", "iguala_contabilita", "iguala_domicilio"]
        
        for expected in expected_types:
            assert expected in type_ids, f"Missing fee type: {expected}"
        
        print(f"✓ Retrieved {len(fee_types)} fee types: {type_ids}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
