"""
Test per la sezione Onorari riorganizzata - Iteration 32
Endpoints testati:
- GET /api/fees/by-category - Onorari raggruppati per categoria cliente
- GET /api/fees/monthly-stats - Statistiche mensili per grafici
- GET /api/fees/category/{id}/clients - Clienti di una categoria con onorari
- GET /api/fees/by-client - Onorari raggruppati per cliente
- GET /api/fees/summary - Riepilogo globale
- GET /api/fees/fee-types - Tipi di onorario
- POST /api/clients/{id}/fees - Creazione onorario con IVA/IGIC
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def headers(admin_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestFeesAuthentication:
    """Test authentication for fees endpoints"""
    
    def test_login_admin_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful - Role: {data['user'].get('role')}")


class TestFeesByCategory:
    """Test GET /api/fees/by-category endpoint"""
    
    def test_get_fees_by_category(self, headers):
        """Test fetching fees grouped by client category"""
        response = requests.get(f"{BASE_URL}/api/fees/by-category", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify structure of each category
        for cat in data:
            assert "id" in cat, "Category should have id"
            assert "name" in cat, "Category should have name"
            assert "icon" in cat, "Category should have icon"
            assert "color" in cat, "Category should have color"
            assert "total_pending" in cat, "Category should have total_pending"
            assert "total_paid" in cat, "Category should have total_paid"
            assert "total_recurring" in cat, "Category should have total_recurring"
            assert "total_gross" in cat, "Category should have total_gross"
            assert "clients_count" in cat, "Category should have clients_count"
            assert "fees_count" in cat, "Category should have fees_count"
        
        print(f"✓ Fees by category: {len(data)} categories found")
        for cat in data[:3]:  # Print first 3
            print(f"  - {cat['name']}: {cat['clients_count']} clients, €{cat['total_gross']:.2f} total")


class TestMonthlyStats:
    """Test GET /api/fees/monthly-stats endpoint"""
    
    def test_get_monthly_stats_current_year(self, headers):
        """Test fetching monthly statistics for current year"""
        current_year = datetime.now().year
        response = requests.get(
            f"{BASE_URL}/api/fees/monthly-stats?year={current_year}", 
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "year" in data, "Response should have year"
        assert "months" in data, "Response should have months"
        assert "totals" in data, "Response should have totals"
        
        # Verify year
        assert data["year"] == current_year
        
        # Verify months structure (12 months)
        assert len(data["months"]) == 12, "Should have 12 months"
        for month in data["months"]:
            assert "month" in month
            assert "month_name" in month
            assert "total_pending" in month
            assert "total_paid" in month
            assert "total_gross" in month
        
        # Verify totals structure
        totals = data["totals"]
        assert "total_gross" in totals
        assert "total_paid" in totals
        assert "total_pending" in totals
        assert "year_change_percent" in totals
        
        print(f"✓ Monthly stats for {current_year}:")
        print(f"  - Total gross: €{totals['total_gross']:.2f}")
        print(f"  - Total paid: €{totals['total_paid']:.2f}")
        print(f"  - Total pending: €{totals['total_pending']:.2f}")
        print(f"  - Year change: {totals['year_change_percent']:.1f}%")
    
    def test_get_monthly_stats_with_category_filter(self, headers):
        """Test monthly stats with category filter"""
        response = requests.get(
            f"{BASE_URL}/api/fees/monthly-stats?year=2025&category=autonomo", 
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "months" in data
        print(f"✓ Monthly stats with category filter: {len(data['months'])} months")


class TestCategoryClients:
    """Test GET /api/fees/category/{id}/clients endpoint"""
    
    def test_get_category_clients_autonomo(self, headers):
        """Test fetching clients for 'autonomo' category"""
        response = requests.get(
            f"{BASE_URL}/api/fees/category/autonomo/clients", 
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify structure if clients exist
        for client in data:
            assert "id" in client
            assert "full_name" in client
            assert "email" in client
            assert "fees_count" in client
            assert "total_pending" in client
            assert "total_paid" in client
            assert "total" in client
        
        print(f"✓ Category 'autonomo' clients: {len(data)} clients found")
    
    def test_get_category_clients_societa(self, headers):
        """Test fetching clients for 'societa' category"""
        response = requests.get(
            f"{BASE_URL}/api/fees/category/societa/clients", 
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✓ Category 'societa' clients: {len(data)} clients found")
    
    def test_get_category_clients_nonexistent(self, headers):
        """Test fetching clients for non-existent category returns empty list"""
        response = requests.get(
            f"{BASE_URL}/api/fees/category/nonexistent_category/clients", 
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0, "Non-existent category should return empty list"
        print("✓ Non-existent category returns empty list")


class TestFeesByClient:
    """Test GET /api/fees/by-client endpoint"""
    
    def test_get_fees_by_client(self, headers):
        """Test fetching fees grouped by client"""
        response = requests.get(f"{BASE_URL}/api/fees/by-client", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify structure
        for client in data:
            assert "id" in client
            assert "full_name" in client
            assert "email" in client
            assert "tipo_cliente" in client
            assert "fees_count" in client
            assert "total_pending" in client
            assert "total_paid" in client
        
        print(f"✓ Fees by client: {len(data)} clients found")


class TestFeesSummary:
    """Test GET /api/fees/summary endpoint"""
    
    def test_get_fees_summary(self, headers):
        """Test fetching global fees summary"""
        response = requests.get(f"{BASE_URL}/api/fees/summary", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "total_pending" in data
        assert "total_paid" in data
        assert "total_overdue" in data
        assert "total_count" in data
        assert "clients_count" in data
        
        print(f"✓ Fees summary:")
        print(f"  - Total pending: €{data['total_pending']:.2f}")
        print(f"  - Total paid: €{data['total_paid']:.2f}")
        print(f"  - Total overdue: €{data['total_overdue']:.2f}")
        print(f"  - Total fees: {data['total_count']}")
        print(f"  - Clients with fees: {data['clients_count']}")


class TestFeeTypes:
    """Test GET /api/fees/fee-types endpoint"""
    
    def test_get_fee_types(self, headers):
        """Test fetching fee types"""
        response = requests.get(f"{BASE_URL}/api/fees/fee-types", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one fee type"
        
        # Verify structure
        for ft in data:
            assert "id" in ft
            assert "label" in ft
            assert "icon" in ft
            assert "color" in ft
        
        print(f"✓ Fee types: {len(data)} types found")
        for ft in data[:5]:  # Print first 5
            print(f"  - {ft['id']}: {ft['label']}")


class TestCreateFeeWithTax:
    """Test creating fees with IVA/IGIC tax calculations"""
    
    @pytest.fixture
    def test_client_id(self, headers):
        """Get a test client ID"""
        response = requests.get(f"{BASE_URL}/api/fees/by-client", headers=headers)
        if response.status_code == 200:
            clients = response.json()
            if clients:
                return clients[0]["id"]
        pytest.skip("No clients available for fee creation test")
    
    def test_create_fee_with_igic_7(self, headers, test_client_id):
        """Test creating a fee with IGIC 7% tax"""
        fee_data = {
            "description": "TEST_Consulenza fiscale IGIC",
            "amount": 100.00,
            "fee_type": "consulenza",
            "status": "pending",
            "tax_type": "IGIC_7",
            "reference_month": 1,
            "reference_year": 2025,
            "is_recurring": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/clients/{test_client_id}/fees",
            json=fee_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["tax_type"] == "IGIC_7"
        assert data["net_amount"] == 100.00
        assert data["tax_amount"] == 7.00  # 7% of 100
        assert data["gross_amount"] == 107.00
        
        print(f"✓ Created fee with IGIC 7%:")
        print(f"  - Net: €{data['net_amount']:.2f}")
        print(f"  - Tax: €{data['tax_amount']:.2f}")
        print(f"  - Gross: €{data['gross_amount']:.2f}")
        
        # Cleanup - delete the test fee
        fee_id = data["id"]
        requests.delete(f"{BASE_URL}/api/clients/{test_client_id}/fees/{fee_id}", headers=headers)
    
    def test_create_fee_with_iva_21(self, headers, test_client_id):
        """Test creating a fee with IVA 21% tax"""
        fee_data = {
            "description": "TEST_Pratica IVA 21",
            "amount": 200.00,
            "fee_type": "pratica",
            "status": "pending",
            "tax_type": "IVA_21",
            "reference_month": 2,
            "reference_year": 2025,
            "is_recurring": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/clients/{test_client_id}/fees",
            json=fee_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["tax_type"] == "IVA_21"
        assert data["net_amount"] == 200.00
        assert data["tax_amount"] == 42.00  # 21% of 200
        assert data["gross_amount"] == 242.00
        
        print(f"✓ Created fee with IVA 21%:")
        print(f"  - Net: €{data['net_amount']:.2f}")
        print(f"  - Tax: €{data['tax_amount']:.2f}")
        print(f"  - Gross: €{data['gross_amount']:.2f}")
        
        # Cleanup
        fee_id = data["id"]
        requests.delete(f"{BASE_URL}/api/clients/{test_client_id}/fees/{fee_id}", headers=headers)
    
    def test_create_fee_esente(self, headers, test_client_id):
        """Test creating a fee with no tax (ESENTE)"""
        fee_data = {
            "description": "TEST_Consulenza esente",
            "amount": 150.00,
            "fee_type": "standard",
            "status": "pending",
            "tax_type": "ESENTE",
            "reference_month": 3,
            "reference_year": 2025,
            "is_recurring": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/clients/{test_client_id}/fees",
            json=fee_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["tax_type"] == "ESENTE"
        assert data["net_amount"] == 150.00
        assert data["tax_amount"] == 0.00
        assert data["gross_amount"] == 150.00
        
        print(f"✓ Created fee ESENTE (no tax):")
        print(f"  - Net: €{data['net_amount']:.2f}")
        print(f"  - Tax: €{data['tax_amount']:.2f}")
        print(f"  - Gross: €{data['gross_amount']:.2f}")
        
        # Cleanup
        fee_id = data["id"]
        requests.delete(f"{BASE_URL}/api/clients/{test_client_id}/fees/{fee_id}", headers=headers)
    
    def test_create_recurring_fee(self, headers, test_client_id):
        """Test creating a recurring fee (Iguala)"""
        fee_data = {
            "description": "TEST_Iguala mensile contabilità",
            "amount": 300.00,
            "fee_type": "iguala_contabilita",
            "status": "recurring",
            "tax_type": "IGIC_7",
            "reference_month": 1,
            "reference_year": 2025,
            "is_recurring": True,
            "recurring_frequency": "monthly"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/clients/{test_client_id}/fees",
            json=fee_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["is_recurring"] == True
        assert data["status"] == "recurring"
        assert data["fee_type"] == "iguala_contabilita"
        
        print(f"✓ Created recurring fee (Iguala):")
        print(f"  - Type: {data['fee_type']}")
        print(f"  - Recurring: {data['is_recurring']}")
        print(f"  - Gross: €{data['gross_amount']:.2f}")
        
        # Cleanup
        fee_id = data["id"]
        requests.delete(f"{BASE_URL}/api/clients/{test_client_id}/fees/{fee_id}", headers=headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
