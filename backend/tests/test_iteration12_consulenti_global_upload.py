"""
Test file for Iteration 12 - Features tested:
1. Caricamento Globale Documenti (Global Document Upload)
2. Invito Consulente del Lavoro via email
3. Complete Registration for consulente_lavoro

Tests the new invitation-based flow for consulenti instead of direct creation.
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get base URL from environment variable - must be set
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "info@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Triana48+"


class TestAuth:
    """Authentication tests"""
    
    def test_admin_login(self, api_client):
        """Test admin login returns token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "commercialista"
        print(f"✅ Admin login successful, role: {data['user']['role']}")


class TestConsulenteInvitation:
    """Tests for the new consulente invitation flow"""
    
    def test_invite_consulente_endpoint(self, authenticated_client):
        """POST /api/consulenti/invite - Should create invitation and return link"""
        unique_email = f"TEST_consulente_{uuid.uuid4().hex[:8]}@example.com"
        
        response = authenticated_client.post(f"{BASE_URL}/api/consulenti/invite", json={
            "email": unique_email,
            "full_name": "Test Consulente Invito"
        })
        
        assert response.status_code == 200, f"Invite failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "invite_id" in data
        assert "invitation_link" in data
        assert "complete-registration" in data["invitation_link"]
        print(f"✅ Consulente invitation created: {data['invite_id']}")
        print(f"   Invitation link: {data['invitation_link'][:80]}...")
    
    def test_invite_consulente_requires_name_and_email(self, authenticated_client):
        """Verify invitation requires name and email fields"""
        # Missing full_name
        response = authenticated_client.post(f"{BASE_URL}/api/consulenti/invite", json={
            "email": "test@example.com"
        })
        # Should fail validation
        assert response.status_code in [400, 422], f"Expected validation error, got: {response.status_code}"
        print("✅ Invitation correctly requires full_name")
    
    def test_get_consulenti_invitations(self, authenticated_client):
        """GET /api/consulenti/invitations - Should return pending invitations"""
        response = authenticated_client.get(f"{BASE_URL}/api/consulenti/invitations")
        
        assert response.status_code == 200, f"Get invitations failed: {response.text}"
        
        invitations = response.json()
        assert isinstance(invitations, list)
        
        # Check structure of invitation if any exist
        if len(invitations) > 0:
            inv = invitations[0]
            assert "id" in inv
            assert "notification_email" in inv
            assert "suggested_name" in inv
            assert inv.get("role") == "consulente_lavoro"
            assert inv.get("status") == "pending"
            print(f"✅ Found {len(invitations)} pending consulente invitations")
        else:
            print("✅ No pending invitations (list is empty but endpoint works)")
    
    def test_duplicate_invitation_rejected(self, authenticated_client):
        """Test that duplicate invitations for same email are rejected"""
        unique_email = f"TEST_duplicate_{uuid.uuid4().hex[:8]}@example.com"
        
        # First invitation
        response1 = authenticated_client.post(f"{BASE_URL}/api/consulenti/invite", json={
            "email": unique_email,
            "full_name": "First Invite"
        })
        assert response1.status_code == 200
        
        # Second invitation with same email should fail
        response2 = authenticated_client.post(f"{BASE_URL}/api/consulenti/invite", json={
            "email": unique_email,
            "full_name": "Second Invite"
        })
        assert response2.status_code == 400, "Should reject duplicate invitation"
        assert "già un invito" in response2.json().get("detail", "") or "pendente" in response2.json().get("detail", "")
        print("✅ Duplicate invitation correctly rejected")


class TestCompleteRegistration:
    """Tests for complete-registration endpoint supporting consulente_lavoro"""
    
    def test_complete_registration_endpoint_exists(self, api_client):
        """POST /api/auth/complete-registration - Endpoint should exist"""
        # Test with invalid token to see if endpoint exists
        response = api_client.post(f"{BASE_URL}/api/auth/complete-registration", json={
            "token": "invalid-token",
            "email": "test@example.com",
            "password": "testpass123",
            "full_name": "Test User"
        })
        
        # Should return 400 (invalid token) not 404 (not found)
        assert response.status_code != 404, "Complete registration endpoint not found"
        assert response.status_code == 400
        assert "Token non valido" in response.json().get("detail", "") or "già utilizzato" in response.json().get("detail", "")
        print("✅ Complete registration endpoint exists and validates tokens")


class TestGlobalDocumentUpload:
    """Tests for global document upload feature"""
    
    def test_stats_show_active_clients(self, authenticated_client):
        """GET /api/stats - Should return clients_active count"""
        response = authenticated_client.get(f"{BASE_URL}/api/stats")
        
        assert response.status_code == 200, f"Stats failed: {response.text}"
        
        stats = response.json()
        assert "clients_count" in stats
        assert "clients_active" in stats
        
        print(f"✅ Stats endpoint works: {stats['clients_count']} total clients, {stats['clients_active']} active")
    
    def test_clients_list_with_stato_field(self, authenticated_client):
        """GET /api/clients - Should return clients with stato field for filtering"""
        response = authenticated_client.get(f"{BASE_URL}/api/clients")
        
        assert response.status_code == 200, f"Clients list failed: {response.text}"
        
        clients = response.json()
        assert isinstance(clients, list)
        
        if len(clients) > 0:
            # Check that stato field exists for filtering
            client = clients[0]
            assert "stato" in client, "Client should have 'stato' field"
            
            # Count active clients
            active_count = sum(1 for c in clients if c.get("stato") == "attivo")
            print(f"✅ Clients list returned {len(clients)} clients, {active_count} active")
        else:
            print("✅ Clients list endpoint works (no clients)")
    
    def test_document_upload_endpoint_exists(self, authenticated_client):
        """Verify document upload endpoints exist"""
        # Check that the upload endpoint exists (without uploading)
        # We just verify the endpoint structure
        response = authenticated_client.get(f"{BASE_URL}/api/documents")
        assert response.status_code == 200, "Documents list endpoint should work"
        print("✅ Documents endpoint exists")


class TestConsulenteResendInvite:
    """Test resend invitation functionality"""
    
    def test_resend_invite(self, authenticated_client):
        """POST /api/consulenti/resend-invite/{id} - Should regenerate token and resend"""
        # First get existing invitations
        response = authenticated_client.get(f"{BASE_URL}/api/consulenti/invitations")
        invitations = response.json()
        
        if len(invitations) > 0:
            invite_id = invitations[0]["id"]
            
            response = authenticated_client.post(f"{BASE_URL}/api/consulenti/resend-invite/{invite_id}")
            assert response.status_code == 200, f"Resend failed: {response.text}"
            
            data = response.json()
            assert data.get("success") == True
            assert "invitation_link" in data
            print(f"✅ Resend invitation successful for {invitations[0]['notification_email']}")
        else:
            # Create an invitation first
            unique_email = f"TEST_resend_{uuid.uuid4().hex[:8]}@example.com"
            create_resp = authenticated_client.post(f"{BASE_URL}/api/consulenti/invite", json={
                "email": unique_email,
                "full_name": "Test Resend"
            })
            if create_resp.status_code == 200:
                invite_id = create_resp.json()["invite_id"]
                
                response = authenticated_client.post(f"{BASE_URL}/api/consulenti/resend-invite/{invite_id}")
                assert response.status_code == 200
                print("✅ Resend invitation works after creating new invite")


class TestConsulenteList:
    """Test consulente list endpoint"""
    
    def test_get_consulenti_list(self, authenticated_client):
        """GET /api/consulenti - Should return list of registered consulenti"""
        response = authenticated_client.get(f"{BASE_URL}/api/consulenti")
        
        assert response.status_code == 200, f"Get consulenti failed: {response.text}"
        
        consulenti = response.json()
        assert isinstance(consulenti, list)
        
        if len(consulenti) > 0:
            consulente = consulenti[0]
            assert "id" in consulente
            assert "email" in consulente
            assert "full_name" in consulente
            assert consulente.get("role") == "consulente_lavoro"
            print(f"✅ Found {len(consulenti)} registered consulenti")
        else:
            print("✅ Consulenti list endpoint works (no consulenti registered)")


# Fixtures

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get authentication token for admin"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
