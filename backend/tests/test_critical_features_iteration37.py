"""
Test critical features for Fiscal Tax Canarie:
- Document preview and download
- Notifications sending
- Declarations access
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"
CLIENT_EMAIL = "test_commercialista_202642@example.com"
CLIENT_PASSWORD = "TestCliente123!"


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        print(f"✓ Admin login successful - role: {data['user'].get('role')}")
        return data["access_token"]
    
    def test_client_login(self):
        """Test client login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"✓ Client login successful - role: {data['user'].get('role')}")
        return data["access_token"]


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def client_token():
    """Get client authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CLIENT_EMAIL,
        "password": CLIENT_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Client authentication failed")


class TestDocuments:
    """Test document-related endpoints"""
    
    def test_get_clients_list(self, admin_token):
        """Test getting clients list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        assert response.status_code == 200, f"Failed to get clients: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} clients")
        return data
    
    def test_get_client_documents_by_folder(self, admin_token):
        """Test getting client documents organized by folder"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get a client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available")
        
        # Find client with documents
        client_id = None
        for client in clients:
            if client.get("name") == "Test Commercialista User":
                client_id = client.get("id")
                break
        
        if not client_id:
            client_id = clients[0].get("id")
        
        response = requests.get(f"{BASE_URL}/api/clients/{client_id}/documents/by-folder", headers=headers)
        assert response.status_code == 200, f"Failed to get documents by folder: {response.text}"
        data = response.json()
        assert "folders" in data, "Response should have folders"
        assert "total_documents" in data, "Response should have total_documents"
        print(f"✓ Got {data['total_documents']} documents in {len(data['folders'])} folders")
    
    def test_get_document_by_id(self, admin_token):
        """Test getting a specific document"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get a client with documents
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        clients = clients_response.json()
        
        for client in clients:
            client_id = client.get("id")
            docs_response = requests.get(f"{BASE_URL}/api/clients/{client_id}/documents/by-folder", headers=headers)
            docs_data = docs_response.json()
            
            if docs_data.get("total_documents", 0) > 0:
                # Find a document
                for folder in docs_data.get("folders", []):
                    if folder.get("documents"):
                        doc_id = folder["documents"][0].get("id")
                        
                        # Get the document
                        doc_response = requests.get(f"{BASE_URL}/api/documents/{doc_id}", headers=headers)
                        assert doc_response.status_code == 200, f"Failed to get document: {doc_response.text}"
                        doc_data = doc_response.json()
                        assert "id" in doc_data, "Document should have id"
                        print(f"✓ Got document: {doc_data.get('file_name', 'unknown')}")
                        return
        
        pytest.skip("No documents found to test")


class TestNotifications:
    """Test notification endpoints"""
    
    def test_get_notification_types(self, admin_token):
        """Test getting notification types"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/types", headers=headers)
        assert response.status_code == 200, f"Failed to get notification types: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} notification types")
    
    def test_send_notification_to_all(self, admin_token):
        """Test sending notification to all clients"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        payload = {
            "type_id": "generale",
            "subject": "Test API Notification",
            "body": "This is a test notification from API tests",
            "target_type": "all",
            "send_email": False,  # Don't send actual emails in test
            "send_inapp": True
        }
        
        response = requests.post(f"{BASE_URL}/api/notifications/send", json=payload, headers=headers)
        # Accept 200, 201, or 202 (accepted for async processing)
        assert response.status_code in [200, 201, 202], f"Failed to send notification: {response.text}"
        print(f"✓ Notification sent successfully")
    
    def test_get_notification_history(self, admin_token):
        """Test getting notification history"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/history", headers=headers)
        assert response.status_code == 200, f"Failed to get notification history: {response.text}"
        data = response.json()
        print(f"✓ Got notification history")


class TestDeclarations:
    """Test declaration endpoints"""
    
    def test_get_declaration_types(self, admin_token):
        """Test getting declaration types"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/declarations/types", headers=headers)
        assert response.status_code == 200, f"Failed to get declaration types: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} declaration types")
    
    def test_get_tax_returns_admin(self, admin_token):
        """Test getting tax returns as admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/declarations/tax-returns", headers=headers)
        assert response.status_code == 200, f"Failed to get tax returns: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} tax returns")
        return data
    
    def test_get_tax_returns_client(self, client_token):
        """Test getting tax returns as client"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.get(f"{BASE_URL}/api/declarations/tax-returns", headers=headers)
        assert response.status_code == 200, f"Failed to get tax returns: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Client got {len(data)} tax returns")
    
    def test_get_declaration_detail(self, admin_token):
        """Test getting declaration detail"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get tax returns
        returns_response = requests.get(f"{BASE_URL}/api/declarations/tax-returns", headers=headers)
        returns = returns_response.json()
        
        if not returns:
            pytest.skip("No tax returns available")
        
        # Get first return detail
        return_id = returns[0].get("id")
        response = requests.get(f"{BASE_URL}/api/declarations/tax-returns/{return_id}", headers=headers)
        assert response.status_code == 200, f"Failed to get declaration detail: {response.text}"
        data = response.json()
        assert "id" in data, "Declaration should have id"
        print(f"✓ Got declaration detail for year {data.get('anno_fiscale')}")


class TestFolderCategories:
    """Test folder categories endpoints"""
    
    def test_get_global_folder_categories(self, admin_token):
        """Test getting global folder categories"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/folder-categories", headers=headers)
        assert response.status_code == 200, f"Failed to get folder categories: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} global folder categories")
    
    def test_get_client_folder_categories(self, admin_token):
        """Test getting client-specific folder categories"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get a client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available")
        
        client_id = clients[0].get("id")
        response = requests.get(f"{BASE_URL}/api/clients/{client_id}/folder-categories", headers=headers)
        assert response.status_code == 200, f"Failed to get client folder categories: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} folder categories for client")


class TestClientDeclarationAccess:
    """Test client access to declarations"""
    
    def test_client_can_access_own_declarations(self, client_token):
        """Test that client can access their own declarations without errors"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        response = requests.get(f"{BASE_URL}/api/declarations/tax-returns", headers=headers)
        assert response.status_code == 200, f"Client failed to access declarations: {response.text}"
        data = response.json()
        
        # If there are declarations, try to access detail
        if data:
            return_id = data[0].get("id")
            detail_response = requests.get(f"{BASE_URL}/api/declarations/tax-returns/{return_id}", headers=headers)
            assert detail_response.status_code == 200, f"Client failed to access declaration detail: {detail_response.text}"
            print(f"✓ Client can access declaration detail")
        else:
            print("✓ Client has no declarations (expected)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
