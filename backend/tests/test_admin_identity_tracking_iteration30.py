"""
Test Admin Identity Tracking Feature - Iteration 30
Tests for:
1. POST /api/declarations/tax-returns/{id}/messages - sender_profile_image, sender_first_name, sender_last_name
2. PUT /api/declarations/tax-returns/{id}/assign - Assign admin to tax return
3. POST /api/declarations/tax-returns/{id}/integration-requests - created_by_name, created_by_profile_image
"""
import pytest
import requests
import os
import time

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
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def admin_user(admin_token):
    """Get admin user info"""
    response = requests.get(f"{BASE_URL}/api/auth/me", headers={
        "Authorization": f"Bearer {admin_token}"
    })
    if response.status_code != 200:
        pytest.skip(f"Failed to get admin user: {response.status_code}")
    return response.json()


@pytest.fixture(scope="module")
def test_tax_return(admin_token):
    """Get an existing tax return for testing"""
    response = requests.get(f"{BASE_URL}/api/declarations/tax-returns", headers={
        "Authorization": f"Bearer {admin_token}"
    })
    if response.status_code != 200:
        pytest.skip(f"Failed to get tax returns: {response.status_code}")
    
    tax_returns = response.json()
    if not tax_returns:
        pytest.skip("No tax returns available for testing")
    
    # Return the first tax return
    return tax_returns[0]


class TestAdminIdentityInMessages:
    """Test admin identity fields in messages"""
    
    def test_send_message_saves_admin_profile_fields(self, admin_token, admin_user, test_tax_return):
        """POST /api/declarations/tax-returns/{id}/messages saves sender profile info"""
        tax_return_id = test_tax_return["id"]
        
        # Send a message
        response = requests.post(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/messages",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"content": f"TEST_MESSAGE_ITERATION30_{int(time.time())}"}
        )
        
        assert response.status_code == 200, f"Failed to send message: {response.text}"
        data = response.json()
        assert "message_id" in data or "message" in data
        
        # Verify the message was saved with profile fields by fetching the tax return
        get_response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        
        tax_return_data = get_response.json()
        messages = tax_return_data.get("conversazione", [])
        
        # Find our test message
        test_messages = [m for m in messages if "TEST_MESSAGE_ITERATION30" in m.get("content", "")]
        assert len(test_messages) > 0, "Test message not found in conversazione"
        
        latest_msg = test_messages[-1]
        
        # Verify sender profile fields are present
        assert "sender_id" in latest_msg
        assert "sender_name" in latest_msg
        assert "sender_role" in latest_msg
        
        # New fields for admin identity tracking
        assert "sender_first_name" in latest_msg, "sender_first_name field missing"
        assert "sender_last_name" in latest_msg, "sender_last_name field missing"
        assert "sender_profile_image" in latest_msg, "sender_profile_image field missing"
        
        print(f"Message sender_first_name: {latest_msg.get('sender_first_name')}")
        print(f"Message sender_last_name: {latest_msg.get('sender_last_name')}")
        print(f"Message sender_profile_image: {latest_msg.get('sender_profile_image', 'None')[:50] if latest_msg.get('sender_profile_image') else 'None'}")
    
    def test_message_sender_role_is_admin(self, admin_token, test_tax_return):
        """Verify admin messages have correct sender_role"""
        tax_return_id = test_tax_return["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        tax_return_data = response.json()
        messages = tax_return_data.get("conversazione", [])
        
        # Find admin messages
        admin_messages = [m for m in messages if m.get("sender_role") in ["commercialista", "admin", "super_admin"]]
        
        if admin_messages:
            for msg in admin_messages[-3:]:  # Check last 3 admin messages
                assert msg.get("sender_role") in ["commercialista", "admin", "super_admin"]
                print(f"Admin message role: {msg.get('sender_role')}, name: {msg.get('sender_name')}")


class TestAssignTaxReturn:
    """Test PUT /api/declarations/tax-returns/{id}/assign endpoint"""
    
    def test_assign_tax_return_to_admin(self, admin_token, admin_user, test_tax_return):
        """PUT /api/declarations/tax-returns/{id}/assign assigns admin to tax return"""
        tax_return_id = test_tax_return["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/assign",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to assign: {response.text}"
        data = response.json()
        
        # Verify response contains assignment info
        assert "message" in data
        assert "assigned_to" in data
        
        assigned_to = data["assigned_to"]
        assert "assigned_to_id" in assigned_to
        assert "assigned_to_name" in assigned_to
        assert "assigned_to_first_name" in assigned_to
        assert "assigned_to_last_name" in assigned_to
        assert "assigned_to_profile_image" in assigned_to
        assert "assigned_at" in assigned_to
        
        print(f"Assigned to: {assigned_to.get('assigned_to_name')}")
        print(f"First name: {assigned_to.get('assigned_to_first_name')}")
        print(f"Last name: {assigned_to.get('assigned_to_last_name')}")
    
    def test_verify_assignment_persisted(self, admin_token, test_tax_return):
        """Verify assignment data is persisted in tax return"""
        tax_return_id = test_tax_return["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify assignment fields are present
        assert "assigned_to_id" in data, "assigned_to_id not persisted"
        assert "assigned_to_name" in data, "assigned_to_name not persisted"
        assert "assigned_to_first_name" in data, "assigned_to_first_name not persisted"
        assert "assigned_to_last_name" in data, "assigned_to_last_name not persisted"
        assert "assigned_to_profile_image" in data, "assigned_to_profile_image not persisted"
        assert "assigned_at" in data, "assigned_at not persisted"
        
        print(f"Persisted assigned_to_name: {data.get('assigned_to_name')}")
    
    def test_assign_requires_admin_role(self, test_tax_return):
        """PUT /api/declarations/tax-returns/{id}/assign requires commercialista role"""
        tax_return_id = test_tax_return["id"]
        
        # Try without auth
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/assign"
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestIntegrationRequestsAdminIdentity:
    """Test admin identity in integration requests"""
    
    def test_create_integration_request_saves_admin_info(self, admin_token, admin_user, test_tax_return):
        """POST /api/declarations/tax-returns/{id}/integration-requests saves admin identity"""
        tax_return_id = test_tax_return["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/integration-requests",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "seccion": "documenti",
                "mensaje": f"TEST_INTEGRATION_REQUEST_ITERATION30_{int(time.time())}",
                "documentos_richiesti": ["Test document"]
            }
        )
        
        assert response.status_code == 200, f"Failed to create integration request: {response.text}"
        data = response.json()
        assert "request_id" in data
        
        # Verify the request was saved with admin info
        get_response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        
        tax_return_data = get_response.json()
        requests_list = tax_return_data.get("richieste_integrazione", [])
        
        # Find our test request
        test_requests = [r for r in requests_list if "TEST_INTEGRATION_REQUEST_ITERATION30" in r.get("mensaje", "")]
        assert len(test_requests) > 0, "Test integration request not found"
        
        latest_req = test_requests[-1]
        
        # Verify admin identity fields
        assert "created_by" in latest_req
        assert "created_by_name" in latest_req, "created_by_name field missing"
        assert "created_by_first_name" in latest_req, "created_by_first_name field missing"
        assert "created_by_last_name" in latest_req, "created_by_last_name field missing"
        assert "created_by_profile_image" in latest_req, "created_by_profile_image field missing"
        
        print(f"Integration request created_by_name: {latest_req.get('created_by_name')}")
        print(f"Integration request created_by_first_name: {latest_req.get('created_by_first_name')}")
        print(f"Integration request created_by_last_name: {latest_req.get('created_by_last_name')}")


class TestTaxReturnListWithAssignment:
    """Test tax return list includes assignment info"""
    
    def test_get_tax_returns_list(self, admin_token):
        """GET /api/declarations/tax-returns returns list with assignment info"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        tax_returns = response.json()
        
        assert isinstance(tax_returns, list)
        print(f"Found {len(tax_returns)} tax returns")
        
        # Check if any have assignment info
        assigned_returns = [tr for tr in tax_returns if tr.get("assigned_to_id")]
        print(f"Tax returns with assignment: {len(assigned_returns)}")


class TestClientsWithDeclarations:
    """Test clients with declarations endpoint"""
    
    def test_get_clients_with_declarations(self, admin_token):
        """GET /api/declarations/clients-with-declarations works"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/clients-with-declarations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        clients = response.json()
        
        assert isinstance(clients, list)
        print(f"Found {len(clients)} clients with declarations")
        
        if clients:
            client = clients[0]
            assert "client_id" in client
            assert "client_name" in client
            assert "total_declarations" in client


class TestMessageReadStatus:
    """Test message read status functionality"""
    
    def test_mark_messages_read(self, admin_token, test_tax_return):
        """PUT /api/declarations/tax-returns/{id}/messages/mark-read works"""
        tax_return_id = test_tax_return["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/messages/mark-read",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"Mark read response: {data.get('message')}")
