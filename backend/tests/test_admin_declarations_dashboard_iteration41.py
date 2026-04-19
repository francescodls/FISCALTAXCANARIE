"""
Test Admin Declarations Dashboard - Iteration 41
Tests for:
- Admin login (francesco@fiscaltaxcanarie.com)
- GET /api/declarations/v2/admin/declarations - list with filters
- GET /api/declarations/v2/admin/stats - dashboard statistics
- PUT /api/declarations/v2/admin/declarations/{id}/status - status change
- POST /api/declarations/v2/declarations/{id}/messages - send message
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials from backend/.env
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"


class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        print(f"Admin login response: {response.status_code}")
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] in ["commercialista", "super_admin", "admin"]
        print(f"Admin role: {data['user']['role']}")
        return data["access_token"]


class TestAdminDeclarationsList:
    """Test admin declarations list with filters"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_get_declarations_list(self, admin_token):
        """GET /api/declarations/v2/admin/declarations - basic list"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Declarations list response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Total declarations: {len(data)}")
        
        if len(data) > 0:
            decl = data[0]
            # Verify required fields
            assert "id" in decl
            assert "status" in decl
            assert "anno_fiscale" in decl
            assert "client_email" in decl
            assert "completion_percentage" in decl
            print(f"First declaration: {decl['id'][:8]}... status={decl['status']}")
    
    def test_filter_by_status(self, admin_token):
        """GET /api/declarations/v2/admin/declarations?status=bozza"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations?status=bozza",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Filter by status response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        # All returned should have status=bozza
        for decl in data:
            assert decl["status"] == "bozza", f"Expected bozza, got {decl['status']}"
        print(f"Declarations with status=bozza: {len(data)}")
    
    def test_filter_by_year(self, admin_token):
        """GET /api/declarations/v2/admin/declarations?anno=2024"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations?anno=2024",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Filter by year response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        for decl in data:
            assert decl["anno_fiscale"] == 2024, f"Expected 2024, got {decl['anno_fiscale']}"
        print(f"Declarations for 2024: {len(data)}")
    
    def test_search_by_text(self, admin_token):
        """GET /api/declarations/v2/admin/declarations?search=test"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations?search=test",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Search response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"Search results for 'test': {len(data)}")
    
    def test_combined_filters(self, admin_token):
        """GET /api/declarations/v2/admin/declarations?status=bozza&anno=2024"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations?status=bozza&anno=2024",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Combined filters response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        for decl in data:
            assert decl["status"] == "bozza"
            assert decl["anno_fiscale"] == 2024
        print(f"Declarations with bozza + 2024: {len(data)}")


class TestAdminStats:
    """Test admin dashboard statistics"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_get_stats(self, admin_token):
        """GET /api/declarations/v2/admin/stats"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Stats response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "total" in data, "Missing 'total' in stats"
        assert "by_status" in data, "Missing 'by_status' in stats"
        assert "new_submissions" in data, "Missing 'new_submissions' in stats"
        assert "pending_review" in data, "Missing 'pending_review' in stats"
        
        print(f"Stats: total={data['total']}, by_status={data['by_status']}")
        print(f"New submissions: {data['new_submissions']}, Pending review: {data['pending_review']}")


class TestAdminStatusChange:
    """Test admin status change functionality"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def test_declaration_id(self, admin_token):
        """Get a declaration ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            data = response.json()
            if len(data) > 0:
                return data[0]["id"]
        pytest.skip("No declarations available for testing")
    
    def test_change_status_to_in_revisione(self, admin_token, test_declaration_id):
        """PUT /api/declarations/v2/admin/declarations/{id}/status - change to in_revisione"""
        # First get current status
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{test_declaration_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        original_status = response.json()["status"]
        print(f"Original status: {original_status}")
        
        # Change to in_revisione
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{test_declaration_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "new_status": "in_revisione",
                "note": "Test status change from iteration 41"
            }
        )
        print(f"Status change response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "in_revisione", f"Expected in_revisione, got {data['status']}"
        print(f"Status changed to: {data['status']}")
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{test_declaration_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"new_status": original_status}
        )
    
    def test_change_status_with_note(self, admin_token, test_declaration_id):
        """Status change with note should add message"""
        # Get current messages count
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{test_declaration_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_messages_count = response.json().get("messages_count", 0)
        original_status = response.json()["status"]
        
        # Change status with note
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{test_declaration_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "new_status": "pronta",
                "note": "Pratica pronta per presentazione - test iteration 41"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        # Messages count should increase when note is provided
        new_messages_count = data.get("messages_count", 0)
        print(f"Messages count: {original_messages_count} -> {new_messages_count}")
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{test_declaration_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"new_status": original_status}
        )


class TestAdminMessages:
    """Test admin message functionality"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def test_declaration_id(self, admin_token):
        """Get a declaration ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            data = response.json()
            if len(data) > 0:
                return data[0]["id"]
        pytest.skip("No declarations available for testing")
    
    def test_send_message(self, admin_token, test_declaration_id):
        """POST /api/declarations/v2/declarations/{id}/messages - send message"""
        response = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{test_declaration_id}/messages",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "content": "Test message from admin - iteration 41",
                "is_integration_request": False
            }
        )
        print(f"Send message response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "messages_count" in data
        print(f"Messages count after send: {data['messages_count']}")
    
    def test_send_integration_request(self, admin_token, test_declaration_id):
        """POST /api/declarations/v2/declarations/{id}/messages - integration request"""
        # Get original status
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{test_declaration_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_status = response.json()["status"]
        
        response = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{test_declaration_id}/messages",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "content": "Richiesta integrazione documenti - test iteration 41",
                "is_integration_request": True
            }
        )
        print(f"Integration request response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Integration request should change status to documentazione_incompleta
        assert data["status"] == "documentazione_incompleta", f"Expected documentazione_incompleta, got {data['status']}"
        assert data["pending_integration_requests"] > 0
        print(f"Status after integration request: {data['status']}")
        print(f"Pending integration requests: {data['pending_integration_requests']}")
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{test_declaration_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"new_status": original_status}
        )
    
    def test_get_messages(self, admin_token, test_declaration_id):
        """GET /api/declarations/v2/declarations/{id}/messages"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{test_declaration_id}/messages",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Get messages response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Messages should be a list"
        print(f"Total messages: {len(data)}")
        
        if len(data) > 0:
            msg = data[-1]  # Last message
            assert "content" in msg
            assert "sender_name" in msg
            assert "created_at" in msg
            print(f"Last message: {msg['content'][:50]}...")


class TestAccessControl:
    """Test access control for admin endpoints"""
    
    def test_admin_endpoints_require_auth(self):
        """Admin endpoints should require authentication"""
        # No token
        response = requests.get(f"{BASE_URL}/api/declarations/v2/admin/declarations")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        response = requests.get(f"{BASE_URL}/api/declarations/v2/admin/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Access control: Unauthenticated requests blocked correctly")
    
    def test_client_cannot_access_admin_endpoints(self):
        """Client role should not access admin endpoints"""
        # Login as client (from previous test)
        client_email = "test_commercialista_202642@example.com"
        client_password = "TestCliente123!"
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": client_email,
            "password": client_password
        })
        
        if response.status_code != 200:
            pytest.skip("Client login failed - skipping access control test")
        
        client_token = response.json()["access_token"]
        
        # Try to access admin endpoints
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/stats",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Access control: Client cannot access admin endpoints")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
