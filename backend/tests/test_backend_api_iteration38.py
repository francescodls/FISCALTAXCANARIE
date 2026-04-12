"""
Backend API Tests - Iteration 38
Testing critical APIs for Fiscal Tax Canarie mobile app consumption:
- /api/ health check
- /api/auth/login
- /api/documents
- /api/deadlines
- /api/notifications
- /api/communications/threads
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
TEST_CLIENT_EMAIL = "test_commercialista_202642@example.com"
TEST_CLIENT_PASSWORD = "TestCliente123!"
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"


class TestAPIHealth:
    """Test API health and basic connectivity"""
    
    def test_api_root_responds(self):
        """Test that /api/ endpoint responds"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root response: {data}")


class TestAuthLogin:
    """Test authentication endpoints"""
    
    def test_client_login_success(self):
        """Test client login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_CLIENT_EMAIL
        assert data["user"]["role"] == "cliente"
        print(f"Client login successful: {data['user']['full_name']} ({data['user']['role']})")
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] in ["super_admin", "admin"]
        print(f"Admin login successful: {data['user']['full_name']} ({data['user']['role']})")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@example.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("Invalid credentials correctly rejected with 401")


class TestAuthMe:
    """Test /auth/me endpoint"""
    
    @pytest.fixture
    def client_token(self):
        """Get client auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get client token")
    
    def test_get_current_user(self, client_token):
        """Test getting current user info"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["email"] == TEST_CLIENT_EMAIL
        assert data["role"] == "cliente"
        assert "id" in data
        assert "full_name" in data
        print(f"Current user: {data['full_name']} (ID: {data['id']})")


class TestDocumentsAPI:
    """Test documents endpoints"""
    
    @pytest.fixture
    def client_token(self):
        """Get client auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get client token")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get admin token")
    
    def test_get_documents_as_client(self, client_token):
        """Test getting documents list as client"""
        response = requests.get(
            f"{BASE_URL}/api/documents",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Client has {len(data)} documents")
        
        # If documents exist, validate structure
        if len(data) > 0:
            doc = data[0]
            assert "id" in doc
            assert "title" in doc
            assert "client_id" in doc
            print(f"First document: {doc['title']} (ID: {doc['id']})")
    
    def test_get_documents_as_admin(self, admin_token):
        """Test getting documents list as admin"""
        response = requests.get(
            f"{BASE_URL}/api/documents",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Admin sees {len(data)} documents")
    
    def test_documents_search(self, admin_token):
        """Test document search endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/documents/search?q=test",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Search returned {len(data)} documents")


class TestDeadlinesAPI:
    """Test deadlines/scadenze endpoints"""
    
    @pytest.fixture
    def client_token(self):
        """Get client auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get client token")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get admin token")
    
    def test_get_deadlines_as_client(self, client_token):
        """Test getting deadlines as client"""
        response = requests.get(
            f"{BASE_URL}/api/deadlines",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Client has {len(data)} deadlines")
        
        # If deadlines exist, validate structure
        if len(data) > 0:
            deadline = data[0]
            assert "id" in deadline
            assert "title" in deadline
            assert "due_date" in deadline
            print(f"First deadline: {deadline['title']} (due: {deadline['due_date']})")
    
    def test_get_deadlines_as_admin(self, admin_token):
        """Test getting deadlines as admin"""
        response = requests.get(
            f"{BASE_URL}/api/deadlines",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Admin sees {len(data)} deadlines")


class TestNotificationsAPI:
    """Test notifications endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token (cached for class)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get admin token")
    
    def test_get_notification_types(self, admin_token):
        """Test getting notification types as admin"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/types",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Found {len(data)} notification types")
    
    def test_get_notification_history(self, admin_token):
        """Test getting notification history as admin"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/history",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Notification history: {len(data)} items")
    
    def test_get_my_notifications_history_as_client(self):
        """Test getting client's notification history"""
        # Login as client
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip("Could not login as client")
        
        client_token = login_response.json()["access_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/my-notifications-history",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Client notification history: {len(data)} items")


class TestCommunicationsAPI:
    """Test communications/threads endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token (cached for class)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get admin token")
    
    def test_get_threads_as_client(self):
        """Test getting communication threads as client"""
        # Login as client
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip("Could not login as client")
        
        client_token = login_response.json()["access_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/communications/threads",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Client has {len(data)} communication threads")
        
        # If threads exist, validate structure
        if len(data) > 0:
            thread = data[0]
            assert "id" in thread
            print(f"First thread ID: {thread['id']}")
    
    def test_get_threads_as_admin(self, admin_token):
        """Test getting communication threads as admin"""
        response = requests.get(
            f"{BASE_URL}/api/communications/threads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Admin sees {len(data)} communication threads")


class TestClientsAPI:
    """Test clients endpoints (admin only)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token (cached for class)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get admin token")
    
    def test_get_clients_list(self, admin_token):
        """Test getting clients list as admin"""
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Admin sees {len(data)} clients")
        
        # Find our test client
        test_client = next((c for c in data if c.get("email") == TEST_CLIENT_EMAIL), None)
        if test_client:
            print(f"Test client found: {test_client['full_name']} (ID: {test_client['id']})")
            return test_client["id"]
    
    def test_get_client_detail(self, admin_token):
        """Test getting specific client details"""
        # First get clients list to find test client ID
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        clients = response.json()
        
        test_client = next((c for c in clients if c.get("email") == TEST_CLIENT_EMAIL), None)
        if not test_client:
            pytest.skip("Test client not found")
        
        # Get client detail
        response = requests.get(
            f"{BASE_URL}/api/clients/{test_client['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["email"] == TEST_CLIENT_EMAIL
        print(f"Client detail: {data['full_name']}, tipo: {data.get('tipo_cliente', 'N/A')}")


class TestModelliTributariAPI:
    """Test modelli tributari endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token (cached for class)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get admin token")
    
    def test_get_modelli_tributari(self, admin_token):
        """Test getting tax models list"""
        response = requests.get(
            f"{BASE_URL}/api/modelli-tributari",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Found {len(data)} modelli tributari")
        
        if len(data) > 0:
            model = data[0]
            assert "codice" in model
            assert "nome" in model
            print(f"First model: {model['codice']} - {model['nome']}")


class TestPushTokensAPI:
    """Test push tokens endpoints (for mobile app)"""
    
    def test_register_push_token(self):
        """Test registering a push token"""
        # Login as client
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip("Could not login as client")
        
        client_token = login_response.json()["access_token"]
        
        response = requests.post(
            f"{BASE_URL}/api/push-tokens",
            headers={"Authorization": f"Bearer {client_token}"},
            json={
                "push_token": "ExponentPushToken[test_iteration38_token]",
                "platform": "ios"
            }
        )
        # Should succeed or return existing
        assert response.status_code in [200, 201]
        print(f"Push token registration response: {response.json()}")
    
    def test_get_push_token_status(self):
        """Test getting push token status"""
        # Login as client
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip("Could not login as client")
        
        client_token = login_response.json()["access_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/push-tokens/status",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Push token status: {data}")


class TestDeclarationsAPI:
    """Test declarations endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token (cached for class)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get admin token")
    
    def test_get_declarations_as_client(self):
        """Test getting declarations as client"""
        # Login as client
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip("Could not login as client")
        
        client_token = login_response.json()["access_token"]
        
        # Clients access their tax returns via /declarations/tax-returns
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Client has {len(data)} tax returns/declarations")
    
    def test_get_tax_returns_as_admin(self, admin_token):
        """Test getting tax returns as admin"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Admin sees {len(data)} tax returns")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
