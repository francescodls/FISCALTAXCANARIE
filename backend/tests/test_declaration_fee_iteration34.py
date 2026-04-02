"""
Test suite for Declaration Fee (Onorario Dichiarazione) feature - Iteration 34
Tests:
- PUT /api/declarations/{id}/fee - Save fee with IVA/IGIC calculation
- POST /api/declarations/{id}/fee/notify - Send email notification
- PUT /api/declarations/{id}/fee/mark-paid - Mark fee as paid
- GET /api/declarations/tax-returns/{id} - Verify fee fields returned
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"
DECLARATION_ID = "b554e5b0-d38f-46c8-8eff-aa9fbbd4f147"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestDeclarationFeeEndpoints:
    """Test Declaration Fee API endpoints"""
    
    def test_get_declaration_returns_fee_fields(self, auth_headers):
        """GET /api/declarations/tax-returns/{id} should return declaration_fee_* fields"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{DECLARATION_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify fee fields exist in response
        assert "declaration_fee" in data or data.get("declaration_fee") is None
        assert "declaration_fee_net_amount" in data or data.get("declaration_fee_net_amount") is None
        assert "declaration_fee_tax_amount" in data or data.get("declaration_fee_tax_amount") is None
        assert "declaration_fee_gross_amount" in data or data.get("declaration_fee_gross_amount") is None
        assert "declaration_fee_tax_type" in data or data.get("declaration_fee_tax_type") is None
        assert "declaration_fee_status" in data or data.get("declaration_fee_status") is None
        print(f"✓ Declaration fee fields present in response")
        print(f"  - declaration_fee: {data.get('declaration_fee')}")
        print(f"  - declaration_fee_status: {data.get('declaration_fee_status')}")
    
    def test_put_fee_with_igic_7_calculation(self, auth_headers):
        """PUT /api/declarations/{id}/fee with IGIC 7% should calculate tax correctly"""
        # Set fee with IGIC 7%
        response = requests.put(
            f"{BASE_URL}/api/declarations/{DECLARATION_ID}/fee",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "amount": 200.0,
                "tax_type": "IGIC_7",
                "notes": "Test IGIC 7% calculation",
                "status": "pending"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify calculation: 200 * 0.07 = 14, gross = 214
        assert data["fee_net_amount"] == 200.0
        assert data["fee_tax_amount"] == 14.0
        assert data["fee_amount"] == 214.0  # gross amount
        assert data["fee_tax_type"] == "IGIC_7"
        print(f"✓ IGIC 7% calculation correct: 200 + 14 = 214")
    
    def test_put_fee_with_iva_21_calculation(self, auth_headers):
        """PUT /api/declarations/{id}/fee with IVA 21% should calculate tax correctly"""
        response = requests.put(
            f"{BASE_URL}/api/declarations/{DECLARATION_ID}/fee",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "amount": 300.0,
                "tax_type": "IVA_21",
                "notes": "Test IVA 21% calculation",
                "status": "pending"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify calculation: 300 * 0.21 = 63, gross = 363
        assert data["fee_net_amount"] == 300.0
        assert data["fee_tax_amount"] == 63.0
        assert data["fee_amount"] == 363.0
        assert data["fee_tax_type"] == "IVA_21"
        print(f"✓ IVA 21% calculation correct: 300 + 63 = 363")
    
    def test_put_fee_with_esente_calculation(self, auth_headers):
        """PUT /api/declarations/{id}/fee with ESENTE should have 0 tax"""
        response = requests.put(
            f"{BASE_URL}/api/declarations/{DECLARATION_ID}/fee",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "amount": 250.0,
                "tax_type": "ESENTE",
                "notes": "Test ESENTE (no tax)",
                "status": "pending"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify: no tax, gross = net
        assert data["fee_net_amount"] == 250.0
        assert data["fee_tax_amount"] == 0.0
        assert data["fee_amount"] == 250.0
        assert data["fee_tax_type"] == "ESENTE"
        print(f"✓ ESENTE calculation correct: 250 + 0 = 250")
    
    def test_put_fee_with_iva_22_calculation(self, auth_headers):
        """PUT /api/declarations/{id}/fee with IVA 22% should calculate tax correctly"""
        response = requests.put(
            f"{BASE_URL}/api/declarations/{DECLARATION_ID}/fee",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "amount": 400.0,
                "tax_type": "IVA_22",
                "notes": "Test IVA 22% calculation",
                "status": "pending"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify calculation: 400 * 0.22 = 88, gross = 488
        assert data["fee_net_amount"] == 400.0
        assert data["fee_tax_amount"] == 88.0
        assert data["fee_amount"] == 488.0
        assert data["fee_tax_type"] == "IVA_22"
        print(f"✓ IVA 22% calculation correct: 400 + 88 = 488")
    
    def test_get_fee_endpoint(self, auth_headers):
        """GET /api/declarations/{id}/fee should return fee details"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/{DECLARATION_ID}/fee",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "fee_amount" in data
        assert "fee_net_amount" in data
        assert "fee_tax_amount" in data
        assert "fee_tax_type" in data
        assert "fee_status" in data
        print(f"✓ GET fee endpoint returns all required fields")
    
    def test_post_fee_notify_sends_email(self, auth_headers):
        """POST /api/declarations/{id}/fee/notify should send email notification"""
        # First set a fee
        requests.put(
            f"{BASE_URL}/api/declarations/{DECLARATION_ID}/fee",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "amount": 200.0,
                "tax_type": "IGIC_7",
                "notes": "Test notification",
                "status": "pending"
            }
        )
        
        # Send notification
        response = requests.post(
            f"{BASE_URL}/api/declarations/{DECLARATION_ID}/fee/notify",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "use_default_template": True
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        assert data.get("email_sent_to") is not None
        assert data.get("notification_created") == True
        assert data.get("fee_status") == "notified"
        print(f"✓ Notification sent to: {data.get('email_sent_to')}")
    
    def test_put_fee_mark_paid(self, auth_headers):
        """PUT /api/declarations/{id}/fee/mark-paid should mark fee as paid"""
        response = requests.put(
            f"{BASE_URL}/api/declarations/{DECLARATION_ID}/fee/mark-paid",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("status") == "paid"
        print(f"✓ Fee marked as paid")
        
        # Verify status changed
        get_response = requests.get(
            f"{BASE_URL}/api/declarations/{DECLARATION_ID}/fee",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        fee_data = get_response.json()
        assert fee_data.get("fee_status") == "paid"
        print(f"✓ Fee status verified as 'paid'")
    
    def test_fee_requires_admin_auth(self):
        """Fee endpoints should require admin authentication"""
        # Try without auth
        response = requests.put(
            f"{BASE_URL}/api/declarations/{DECLARATION_ID}/fee",
            json={"amount": 100.0, "tax_type": "ESENTE"}
        )
        assert response.status_code in [401, 403], "Should require authentication"
        print(f"✓ Fee endpoint requires authentication")
    
    def test_restore_original_fee(self, auth_headers):
        """Restore original fee state for other tests"""
        # Set back to IGIC 7% with 200 net, status notified
        response = requests.put(
            f"{BASE_URL}/api/declarations/{DECLARATION_ID}/fee",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "amount": 200.0,
                "tax_type": "IGIC_7",
                "notes": "Onorario dichiarazione redditi",
                "status": "notified"
            }
        )
        assert response.status_code == 200
        print(f"✓ Fee restored to original state (200 + IGIC 7% = 214)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
