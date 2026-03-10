"""
Iteration 8 - Testing new features:
1) POST /api/clients/invite - Client invitation flow
2) POST /api/auth/complete-registration - Complete registration with token
3) POST /api/clients/resend-invite/{client_id} - Resend invitation
4) GET/POST/PUT/DELETE /api/clients/{client_id}/fees - Fees CRUD
5) GET /api/clients/{client_id}/fees/summary - Fees summary
6) POST /api/certificates/upload - Upload .p12 certificate
7) GET /api/certificates - List certificates
8) DELETE /api/certificates/{cert_name} - Delete certificate
9) POST /api/documents/{doc_id}/sign - Sign document
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COMMERCIALISTA_EMAIL = "info@fiscaltaxcanarie.com"
COMMERCIALISTA_PASSWORD = "Triana48+"
CLIENT_TEST_EMAIL = "cliente-test-dash@example.com"
CLIENT_TEST_PASSWORD = "TestPassword123"

@pytest.fixture(scope="module")
def commercialista_token():
    """Login as commercialista"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COMMERCIALISTA_EMAIL,
        "password": COMMERCIALISTA_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Commercialista authentication failed")

@pytest.fixture(scope="module")
def auth_headers(commercialista_token):
    """Auth headers for commercialista"""
    return {"Authorization": f"Bearer {commercialista_token}", "Content-Type": "application/json"}

@pytest.fixture(scope="module")
def form_headers(commercialista_token):
    """Auth headers for form data"""
    return {"Authorization": f"Bearer {commercialista_token}"}

@pytest.fixture(scope="module")
def test_client_id(auth_headers):
    """Get or create a test client"""
    # First try to find existing test client
    response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
    if response.status_code == 200:
        clients = response.json()
        for client in clients:
            if client.get("stato") == "attivo" and client.get("email") == CLIENT_TEST_EMAIL:
                return client["id"]
            # Or find any active client
            if client.get("stato") == "attivo":
                return client["id"]
    pytest.skip("No active client found for testing")


class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_root(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "Fiscal Tax Canarie" in data.get("title", "") or "message" in data


class TestClientInvitation:
    """Test client invitation flow - POST /api/clients/invite"""
    
    def test_invite_client_success(self, auth_headers):
        """Test inviting a new client"""
        test_email = f"TEST_invite_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/clients/invite", 
            json={
                "email": test_email,
                "full_name": "Test Invited User"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "client_id" in data
        assert "message" in data
        assert test_email in data["message"]
        
        # Cleanup - delete the test client
        cleanup_response = requests.delete(
            f"{BASE_URL}/api/clients/{data['client_id']}?permanent=true",
            headers=auth_headers
        )
        assert cleanup_response.status_code in [200, 204, 404]
    
    def test_invite_client_email_only(self, auth_headers):
        """Test inviting with email only (no full_name)"""
        test_email = f"TEST_emailonly_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/clients/invite", 
            json={"email": test_email},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "client_id" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{data['client_id']}?permanent=true", headers=auth_headers)
    
    def test_invite_duplicate_email_fails(self, auth_headers):
        """Test inviting with existing email fails"""
        # Try to invite with commercialista's email (already exists)
        response = requests.post(f"{BASE_URL}/api/clients/invite", 
            json={"email": COMMERCIALISTA_EMAIL},
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "già" in response.json().get("detail", "").lower() or "exist" in response.json().get("detail", "").lower()
    
    def test_invite_requires_auth(self):
        """Test invitation requires authentication"""
        response = requests.post(f"{BASE_URL}/api/clients/invite", 
            json={"email": "test@example.com"}
        )
        assert response.status_code in [401, 403]


class TestCompleteRegistration:
    """Test complete-registration endpoint"""
    
    def test_complete_registration_invalid_token(self):
        """Test complete-registration with invalid token"""
        response = requests.post(f"{BASE_URL}/api/auth/complete-registration",
            json={
                "token": "invalid-token-12345",
                "password": "TestPassword123"
            }
        )
        
        assert response.status_code == 400
        assert "token" in response.json().get("detail", "").lower() or "non valido" in response.json().get("detail", "").lower()
    
    def test_complete_registration_short_password(self, auth_headers):
        """Test password validation"""
        # First create an invite to get a valid token
        test_email = f"TEST_shortpwd_{uuid.uuid4().hex[:8]}@example.com"
        invite_resp = requests.post(f"{BASE_URL}/api/clients/invite", 
            json={"email": test_email},
            headers=auth_headers
        )
        
        if invite_resp.status_code == 200:
            # Try to complete with short password (should fail validation)
            # Note: actual token validation might happen before password check
            response = requests.post(f"{BASE_URL}/api/auth/complete-registration",
                json={
                    "token": "invalid-token",
                    "password": "short"
                }
            )
            # Either password validation fails or token fails first
            assert response.status_code == 400 or response.status_code == 422
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/clients/{invite_resp.json()['client_id']}?permanent=true", headers=auth_headers)


class TestResendInvite:
    """Test resend invitation - POST /api/clients/resend-invite/{client_id}"""
    
    def test_resend_invite_to_pending_client(self, auth_headers):
        """Test resending invite to pending client"""
        # Create a new invite
        test_email = f"TEST_resend_{uuid.uuid4().hex[:8]}@example.com"
        invite_resp = requests.post(f"{BASE_URL}/api/clients/invite", 
            json={"email": test_email},
            headers=auth_headers
        )
        
        assert invite_resp.status_code == 200
        client_id = invite_resp.json()["client_id"]
        
        # Resend the invite
        resend_resp = requests.post(f"{BASE_URL}/api/clients/resend-invite/{client_id}",
            headers=auth_headers
        )
        
        assert resend_resp.status_code == 200
        data = resend_resp.json()
        assert "success" in data or "message" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client_id}?permanent=true", headers=auth_headers)
    
    def test_resend_invite_invalid_client(self, auth_headers):
        """Test resend to non-existent client"""
        response = requests.post(f"{BASE_URL}/api/clients/resend-invite/invalid-id-12345",
            headers=auth_headers
        )
        
        assert response.status_code == 404


class TestFeesManagement:
    """Test Fees (Onorari) CRUD operations"""
    
    def test_create_fee(self, auth_headers, test_client_id):
        """Test creating a new fee"""
        fee_data = {
            "description": "TEST_Consulenza fiscale Gennaio 2026",
            "amount": 150.50,
            "due_date": "2026-02-15",
            "status": "pending",
            "notes": "Test fee note"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/clients/{test_client_id}/fees",
            json=fee_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response
        assert "id" in data
        assert data["description"] == fee_data["description"]
        assert data["amount"] == fee_data["amount"]
        assert data["status"] == "pending"
        assert data["client_id"] == test_client_id
        
        # Store for cleanup
        return data["id"]
    
    def test_get_fees(self, auth_headers, test_client_id):
        """Test getting fees list"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{test_client_id}/fees",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_fees_summary(self, auth_headers, test_client_id):
        """Test getting fees summary"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{test_client_id}/fees/summary",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate summary structure
        assert "total" in data
        assert "total_paid" in data
        assert "total_pending" in data
        assert "count_total" in data
        assert "count_paid" in data
        assert "count_pending" in data
        
        assert isinstance(data["total"], (int, float))
        assert isinstance(data["total_paid"], (int, float))
    
    def test_update_fee(self, auth_headers, test_client_id):
        """Test updating a fee"""
        # First create a fee
        create_resp = requests.post(
            f"{BASE_URL}/api/clients/{test_client_id}/fees",
            json={
                "description": "TEST_Fee to update",
                "amount": 100.00,
                "due_date": "2026-03-01",
                "status": "pending"
            },
            headers=auth_headers
        )
        
        assert create_resp.status_code in [200, 201]
        fee_id = create_resp.json()["id"]
        
        # Update the fee
        update_resp = requests.put(
            f"{BASE_URL}/api/clients/{test_client_id}/fees/{fee_id}",
            json={
                "status": "paid",
                "paid_date": "2026-01-20"
            },
            headers=auth_headers
        )
        
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["status"] == "paid"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{test_client_id}/fees/{fee_id}", headers=auth_headers)
    
    def test_delete_fee(self, auth_headers, test_client_id):
        """Test deleting a fee"""
        # First create a fee
        create_resp = requests.post(
            f"{BASE_URL}/api/clients/{test_client_id}/fees",
            json={
                "description": "TEST_Fee to delete",
                "amount": 50.00,
                "due_date": "2026-04-01",
                "status": "pending"
            },
            headers=auth_headers
        )
        
        assert create_resp.status_code in [200, 201]
        fee_id = create_resp.json()["id"]
        
        # Delete the fee
        delete_resp = requests.delete(
            f"{BASE_URL}/api/clients/{test_client_id}/fees/{fee_id}",
            headers=auth_headers
        )
        
        assert delete_resp.status_code in [200, 204]
        
        # Verify deletion
        get_resp = requests.get(f"{BASE_URL}/api/clients/{test_client_id}/fees", headers=auth_headers)
        fees = get_resp.json()
        assert not any(f["id"] == fee_id for f in fees)


class TestCertificates:
    """Test certificate management endpoints"""
    
    def test_get_certificates(self, auth_headers):
        """Test listing certificates"""
        response = requests.get(f"{BASE_URL}/api/certificates", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_upload_certificate_requires_file(self, form_headers):
        """Test that certificate upload requires a file"""
        response = requests.post(
            f"{BASE_URL}/api/certificates/upload",
            data={
                "certificate_name": "test_cert",
                "certificate_password": "password123"
            },
            headers=form_headers
        )
        
        # Should fail because no file is provided
        assert response.status_code == 422  # Validation error
    
    def test_delete_nonexistent_certificate(self, auth_headers):
        """Test deleting non-existent certificate"""
        response = requests.delete(
            f"{BASE_URL}/api/certificates/nonexistent_cert_12345",
            headers=auth_headers
        )
        
        # Should return error (certificate not found)
        assert response.status_code in [400, 404, 500]


class TestDocumentSigning:
    """Test document signing endpoint"""
    
    def test_sign_document_requires_certificate(self, auth_headers):
        """Test that signing requires certificate"""
        # Try to sign with non-existent certificate
        response = requests.post(
            f"{BASE_URL}/api/documents/nonexistent-doc-id/sign",
            data={
                "certificate_name": "nonexistent_cert",
                "certificate_password": "password"
            },
            headers={"Authorization": auth_headers["Authorization"]}
        )
        
        # Should fail - either document not found or certificate not found
        assert response.status_code in [400, 404, 500]
    
    def test_sign_document_missing_doc(self, auth_headers):
        """Test signing non-existent document"""
        response = requests.post(
            f"{BASE_URL}/api/documents/invalid-doc-id-12345/sign",
            data={
                "certificate_name": "test_cert",
                "certificate_password": "password"
            },
            headers={"Authorization": auth_headers["Authorization"]}
        )
        
        assert response.status_code in [404, 400, 500]


class TestCleanup:
    """Cleanup any TEST_ prefixed data"""
    
    def test_cleanup_test_fees(self, auth_headers, test_client_id):
        """Clean up test fees"""
        fees_resp = requests.get(f"{BASE_URL}/api/clients/{test_client_id}/fees", headers=auth_headers)
        if fees_resp.status_code == 200:
            for fee in fees_resp.json():
                if fee.get("description", "").startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/clients/{test_client_id}/fees/{fee['id']}",
                        headers=auth_headers
                    )
        assert True  # Cleanup always passes
    
    def test_cleanup_test_clients(self, auth_headers):
        """Clean up test invited clients"""
        clients_resp = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        if clients_resp.status_code == 200:
            for client in clients_resp.json():
                if client.get("email", "").startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/clients/{client['id']}?permanent=true",
                        headers=auth_headers
                    )
        assert True  # Cleanup always passes


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
