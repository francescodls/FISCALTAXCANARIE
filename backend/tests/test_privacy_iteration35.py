"""
Test Privacy Routes - Iteration 35
Tests for privacy consent and privacy requests endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"
TEST_CLIENT_EMAIL = "test.privacy@example.com"
TEST_CLIENT_PASSWORD = "TestPassword123!"


class TestPrivacyEndpoints:
    """Privacy consent and requests endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        
    def get_client_token(self):
        """Get client authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CLIENT_EMAIL,
            "password": TEST_CLIENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
        
    def create_test_client_if_needed(self, admin_token):
        """Create test client if it doesn't exist"""
        # Try to login first
        client_token = self.get_client_token()
        if client_token:
            return client_token
            
        # Create the client via admin
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = self.session.post(f"{BASE_URL}/api/clients", json={
            "email": TEST_CLIENT_EMAIL,
            "full_name": "Test Privacy User",
            "password": TEST_CLIENT_PASSWORD,
            "phone": "+34 600 000 000"
        }, headers=headers)
        
        if response.status_code in [200, 201]:
            # Now login as client
            return self.get_client_token()
        elif response.status_code == 400 and "già registrata" in response.text.lower():
            # Client exists but password might be different
            pytest.skip("Test client exists but cannot login - password mismatch")
        else:
            pytest.skip(f"Could not create test client: {response.status_code} - {response.text}")
    
    # ==================== GET /api/privacy/consent ====================
    
    def test_get_privacy_consent_unauthenticated(self):
        """Test GET /api/privacy/consent without authentication returns 401/403"""
        response = self.session.get(f"{BASE_URL}/api/privacy/consent")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ GET /api/privacy/consent returns {response.status_code} without auth")
        
    def test_get_privacy_consent_authenticated(self):
        """Test GET /api/privacy/consent returns consent status"""
        admin_token = self.get_admin_token()
        client_token = self.create_test_client_if_needed(admin_token)
        
        if not client_token:
            pytest.skip("Could not get client token")
            
        headers = {"Authorization": f"Bearer {client_token}"}
        response = self.session.get(f"{BASE_URL}/api/privacy/consent", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "user_id" in data, "Response should contain user_id"
        assert "consent_type" in data, "Response should contain consent_type"
        assert "accepted" in data, "Response should contain accepted"
        print(f"✓ GET /api/privacy/consent returns consent status: accepted={data.get('accepted')}")
        
    # ==================== POST /api/privacy/consent ====================
    
    def test_post_privacy_consent_unauthenticated(self):
        """Test POST /api/privacy/consent without authentication returns 401/403"""
        response = self.session.post(f"{BASE_URL}/api/privacy/consent", json={
            "consent_type": "privacy_policy",
            "accepted": True
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ POST /api/privacy/consent returns {response.status_code} without auth")
        
    def test_post_privacy_consent_accept(self):
        """Test POST /api/privacy/consent saves consent with IP tracking"""
        admin_token = self.get_admin_token()
        client_token = self.create_test_client_if_needed(admin_token)
        
        if not client_token:
            pytest.skip("Could not get client token")
            
        headers = {"Authorization": f"Bearer {client_token}"}
        response = self.session.post(f"{BASE_URL}/api/privacy/consent", json={
            "consent_type": "privacy_policy",
            "accepted": True,
            "policy_url": "https://fiscaltaxcanarie.com/privacy-policy/"
        }, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("accepted") == True, "Consent should be accepted"
        assert data.get("consent_type") == "privacy_policy", "Consent type should be privacy_policy"
        assert "accepted_at" in data, "Response should contain accepted_at timestamp"
        assert "ip_address" in data, "Response should contain ip_address for GDPR tracking"
        assert "user_agent" in data, "Response should contain user_agent for GDPR tracking"
        print(f"✓ POST /api/privacy/consent saves consent with IP: {data.get('ip_address')}")
        
    def test_post_privacy_consent_revoke(self):
        """Test POST /api/privacy/consent can revoke consent"""
        admin_token = self.get_admin_token()
        client_token = self.create_test_client_if_needed(admin_token)
        
        if not client_token:
            pytest.skip("Could not get client token")
            
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # First accept
        self.session.post(f"{BASE_URL}/api/privacy/consent", json={
            "consent_type": "privacy_policy",
            "accepted": True
        }, headers=headers)
        
        # Then revoke
        response = self.session.post(f"{BASE_URL}/api/privacy/consent", json={
            "consent_type": "privacy_policy",
            "accepted": False
        }, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("accepted") == False, "Consent should be revoked"
        print("✓ POST /api/privacy/consent can revoke consent")
        
    # ==================== GET /api/privacy/requests ====================
    
    def test_get_privacy_requests_unauthenticated(self):
        """Test GET /api/privacy/requests without authentication returns 401/403"""
        response = self.session.get(f"{BASE_URL}/api/privacy/requests")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ GET /api/privacy/requests returns {response.status_code} without auth")
        
    def test_get_privacy_requests_authenticated(self):
        """Test GET /api/privacy/requests returns user's requests"""
        admin_token = self.get_admin_token()
        client_token = self.create_test_client_if_needed(admin_token)
        
        if not client_token:
            pytest.skip("Could not get client token")
            
        headers = {"Authorization": f"Bearer {client_token}"}
        response = self.session.get(f"{BASE_URL}/api/privacy/requests", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/privacy/requests returns {len(data)} requests")
        
    # ==================== POST /api/privacy/requests ====================
    
    def test_post_privacy_request_unauthenticated(self):
        """Test POST /api/privacy/requests without authentication returns 401/403"""
        response = self.session.post(f"{BASE_URL}/api/privacy/requests", json={
            "request_type": "access",
            "message": "Test request"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ POST /api/privacy/requests returns {response.status_code} without auth")
        
    def test_post_privacy_request_access(self):
        """Test POST /api/privacy/requests creates access request"""
        admin_token = self.get_admin_token()
        client_token = self.create_test_client_if_needed(admin_token)
        
        if not client_token:
            pytest.skip("Could not get client token")
            
        headers = {"Authorization": f"Bearer {client_token}"}
        response = self.session.post(f"{BASE_URL}/api/privacy/requests", json={
            "request_type": "access",
            "subject": "Richiesta accesso dati",
            "message": "Vorrei ricevere una copia di tutti i miei dati personali."
        }, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("request_type") == "access", "Request type should be access"
        assert data.get("status") == "pending", "Status should be pending"
        assert "id" in data, "Response should contain id"
        assert "created_at" in data, "Response should contain created_at"
        print(f"✓ POST /api/privacy/requests creates access request with id: {data.get('id')}")
        
    def test_post_privacy_request_erasure(self):
        """Test POST /api/privacy/requests creates erasure request"""
        admin_token = self.get_admin_token()
        client_token = self.create_test_client_if_needed(admin_token)
        
        if not client_token:
            pytest.skip("Could not get client token")
            
        headers = {"Authorization": f"Bearer {client_token}"}
        response = self.session.post(f"{BASE_URL}/api/privacy/requests", json={
            "request_type": "erasure",
            "subject": "Richiesta cancellazione",
            "message": "Vorrei richiedere la cancellazione dei miei dati personali."
        }, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("request_type") == "erasure", "Request type should be erasure"
        print(f"✓ POST /api/privacy/requests creates erasure request")
        
    def test_post_privacy_request_all_types(self):
        """Test POST /api/privacy/requests supports all GDPR request types"""
        admin_token = self.get_admin_token()
        client_token = self.create_test_client_if_needed(admin_token)
        
        if not client_token:
            pytest.skip("Could not get client token")
            
        headers = {"Authorization": f"Bearer {client_token}"}
        
        request_types = ["access", "rectification", "erasure", "restriction", "portability", "info", "other"]
        
        for req_type in request_types:
            response = self.session.post(f"{BASE_URL}/api/privacy/requests", json={
                "request_type": req_type,
                "message": f"Test request for {req_type}"
            }, headers=headers)
            
            assert response.status_code == 200, f"Expected 200 for {req_type}, got {response.status_code}"
            
        print(f"✓ POST /api/privacy/requests supports all {len(request_types)} GDPR request types")
        
    # ==================== Admin Endpoints ====================
    
    def test_get_admin_requests_unauthenticated(self):
        """Test GET /api/privacy/admin/requests without authentication returns 401/403"""
        response = self.session.get(f"{BASE_URL}/api/privacy/admin/requests")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ GET /api/privacy/admin/requests returns {response.status_code} without auth")
        
    def test_get_admin_requests_non_admin(self):
        """Test GET /api/privacy/admin/requests with non-admin returns 403"""
        admin_token = self.get_admin_token()
        client_token = self.create_test_client_if_needed(admin_token)
        
        if not client_token:
            pytest.skip("Could not get client token")
            
        headers = {"Authorization": f"Bearer {client_token}"}
        response = self.session.get(f"{BASE_URL}/api/privacy/admin/requests", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ GET /api/privacy/admin/requests returns 403 for non-admin")
        
    def test_get_admin_requests_admin(self):
        """Test GET /api/privacy/admin/requests returns all requests for admin"""
        admin_token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = self.session.get(f"{BASE_URL}/api/privacy/admin/requests", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/privacy/admin/requests returns {len(data)} requests for admin")
        
    def test_get_admin_consent_stats_unauthenticated(self):
        """Test GET /api/privacy/admin/consents/stats without authentication returns 401/403"""
        response = self.session.get(f"{BASE_URL}/api/privacy/admin/consents/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ GET /api/privacy/admin/consents/stats returns {response.status_code} without auth")
        
    def test_get_admin_consent_stats_non_admin(self):
        """Test GET /api/privacy/admin/consents/stats with non-admin returns 403"""
        admin_token = self.get_admin_token()
        client_token = self.create_test_client_if_needed(admin_token)
        
        if not client_token:
            pytest.skip("Could not get client token")
            
        headers = {"Authorization": f"Bearer {client_token}"}
        response = self.session.get(f"{BASE_URL}/api/privacy/admin/consents/stats", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ GET /api/privacy/admin/consents/stats returns 403 for non-admin")
        
    def test_get_admin_consent_stats_admin(self):
        """Test GET /api/privacy/admin/consents/stats returns stats for admin"""
        admin_token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = self.session.get(f"{BASE_URL}/api/privacy/admin/consents/stats", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_clients" in data, "Response should contain total_clients"
        assert "consents_accepted" in data, "Response should contain consents_accepted"
        assert "consent_rate" in data, "Response should contain consent_rate"
        assert "requests" in data, "Response should contain requests"
        
        print(f"✓ GET /api/privacy/admin/consents/stats returns stats: {data.get('consents_accepted')}/{data.get('total_clients')} consents ({data.get('consent_rate')}%)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
