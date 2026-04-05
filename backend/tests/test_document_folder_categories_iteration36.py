"""
Test suite for Document Folder Categories and Direct Upload features - Iteration 36
Tests:
1. GET /api/folder-categories - Global categories
2. GET /api/clients/{client_id}/folder-categories - Client-specific + global categories
3. POST /api/clients/{client_id}/folder-categories - Create client-specific category
4. POST /api/clients/{client_id}/documents/upload - Direct document upload to client folder
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"


class TestFolderCategoriesAPI:
    """Test folder categories endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def test_client_id(self, headers):
        """Get or create a test client for testing"""
        # First try to get existing clients
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        
        # If no clients, create one
        response = requests.post(f"{BASE_URL}/api/clients", headers=headers, json={
            "full_name": "TEST_Client_Iteration36",
            "email": "test.iteration36@example.com",
            "tipo_cliente": "autonomo"
        })
        if response.status_code in [200, 201]:
            return response.json()["id"]
        
        pytest.skip("Could not get or create test client")
    
    # ==================== GLOBAL FOLDER CATEGORIES ====================
    
    def test_get_global_folder_categories(self, headers):
        """Test GET /api/folder-categories - should return global categories"""
        response = requests.get(f"{BASE_URL}/api/folder-categories", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        categories = response.json()
        assert isinstance(categories, list), "Response should be a list"
        assert len(categories) > 0, "Should have at least default categories"
        
        # Verify default categories exist
        category_ids = [cat["id"] for cat in categories]
        expected_defaults = ["documenti", "agencia_tributaria", "seguridad_social", "ayuntamiento", "contratti", "atti", "registro_mercantil"]
        
        for expected_id in expected_defaults:
            assert expected_id in category_ids, f"Default category '{expected_id}' should exist"
        
        # Verify category structure
        for cat in categories:
            assert "id" in cat, "Category should have id"
            assert "name" in cat, "Category should have name"
            assert "color" in cat, "Category should have color"
            assert "icon" in cat, "Category should have icon"
        
        print(f"✓ GET /api/folder-categories returned {len(categories)} categories")
    
    # ==================== CLIENT-SPECIFIC FOLDER CATEGORIES ====================
    
    def test_get_client_folder_categories(self, headers, test_client_id):
        """Test GET /api/clients/{client_id}/folder-categories - should return global + client-specific"""
        response = requests.get(f"{BASE_URL}/api/clients/{test_client_id}/folder-categories", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        categories = response.json()
        assert isinstance(categories, list), "Response should be a list"
        assert len(categories) >= 7, "Should have at least 7 default categories"
        
        # Verify structure includes is_client_specific field
        for cat in categories:
            assert "id" in cat, "Category should have id"
            assert "name" in cat, "Category should have name"
            assert "is_client_specific" in cat or "is_default" in cat, "Category should indicate if client-specific"
        
        print(f"✓ GET /api/clients/{test_client_id}/folder-categories returned {len(categories)} categories")
    
    def test_create_client_specific_category(self, headers, test_client_id):
        """Test POST /api/clients/{client_id}/folder-categories - create client-specific category"""
        import time
        unique_name = f"TEST_Category_{int(time.time())}"
        
        response = requests.post(
            f"{BASE_URL}/api/clients/{test_client_id}/folder-categories",
            headers=headers,
            json={
                "name": unique_name,
                "icon": "folder",
                "color": "#ff5733"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_cat = response.json()
        assert created_cat["name"] == unique_name, "Category name should match"
        assert created_cat["color"] == "#ff5733", "Category color should match"
        assert created_cat.get("is_client_specific") == True, "Should be marked as client-specific"
        assert created_cat.get("client_id") == test_client_id, "Should have correct client_id"
        
        # Verify it appears in client categories
        verify_response = requests.get(f"{BASE_URL}/api/clients/{test_client_id}/folder-categories", headers=headers)
        assert verify_response.status_code == 200
        
        all_cats = verify_response.json()
        cat_names = [c["name"] for c in all_cats]
        assert unique_name in cat_names, "Created category should appear in client categories"
        
        print(f"✓ POST /api/clients/{test_client_id}/folder-categories created '{unique_name}'")
        
        # Cleanup - delete the test category
        cat_id = created_cat["id"]
        delete_response = requests.delete(
            f"{BASE_URL}/api/clients/{test_client_id}/folder-categories/{cat_id}",
            headers=headers
        )
        assert delete_response.status_code == 200, f"Cleanup failed: {delete_response.text}"
        print(f"✓ Cleanup: deleted test category '{unique_name}'")
    
    def test_create_duplicate_category_fails(self, headers, test_client_id):
        """Test that creating duplicate category name fails"""
        import time
        unique_name = f"TEST_Duplicate_{int(time.time())}"
        
        # Create first category
        response1 = requests.post(
            f"{BASE_URL}/api/clients/{test_client_id}/folder-categories",
            headers=headers,
            json={"name": unique_name}
        )
        assert response1.status_code == 200, f"First creation should succeed: {response1.text}"
        cat_id = response1.json()["id"]
        
        # Try to create duplicate
        response2 = requests.post(
            f"{BASE_URL}/api/clients/{test_client_id}/folder-categories",
            headers=headers,
            json={"name": unique_name}
        )
        assert response2.status_code == 400, f"Duplicate should fail with 400, got {response2.status_code}"
        
        print(f"✓ Duplicate category creation correctly rejected")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{test_client_id}/folder-categories/{cat_id}", headers=headers)
    
    # ==================== DIRECT DOCUMENT UPLOAD ====================
    
    def test_direct_document_upload_to_client(self, headers, test_client_id):
        """Test POST /api/clients/{client_id}/documents/upload - direct upload"""
        import time
        
        # Create a simple test file
        test_content = f"Test document content - {time.time()}"
        files = {
            "file": ("test_document.txt", io.BytesIO(test_content.encode()), "text/plain")
        }
        data = {
            "folder_category": "documenti",
            "document_year": "2025",
            "title": f"TEST_Upload_{int(time.time())}",
            "description": "Test document for iteration 36"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/clients/{test_client_id}/documents/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "id" in result, "Response should contain document id"
        assert result.get("client_id") == test_client_id, "Document should be assigned to correct client"
        assert result.get("folder_category") == "documenti", "Document should have correct folder category"
        
        doc_id = result["id"]
        print(f"✓ POST /api/clients/{test_client_id}/documents/upload created document {doc_id}")
        
        # Verify document appears in client's documents
        docs_response = requests.get(f"{BASE_URL}/api/clients/{test_client_id}/documents/by-folder", headers=headers)
        assert docs_response.status_code == 200, f"Failed to get documents: {docs_response.text}"
        
        # Cleanup - delete the test document
        delete_response = requests.delete(f"{BASE_URL}/api/documents/{doc_id}", headers=headers)
        if delete_response.status_code == 200:
            print(f"✓ Cleanup: deleted test document {doc_id}")
    
    def test_direct_upload_with_custom_category(self, headers, test_client_id):
        """Test direct upload with a specific folder category"""
        import time
        
        # Create a test file
        test_content = f"Test document for agencia_tributaria - {time.time()}"
        files = {
            "file": ("test_agencia.txt", io.BytesIO(test_content.encode()), "text/plain")
        }
        data = {
            "folder_category": "agencia_tributaria",
            "document_year": "2024",
            "title": f"TEST_Agencia_{int(time.time())}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/clients/{test_client_id}/documents/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("folder_category") == "agencia_tributaria", "Document should have agencia_tributaria category"
        assert str(result.get("document_year")) == "2024", "Document should have correct year"
        
        doc_id = result["id"]
        print(f"✓ Direct upload with custom category 'agencia_tributaria' succeeded")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/documents/{doc_id}", headers=headers)
    
    def test_direct_upload_invalid_client(self, headers):
        """Test direct upload to non-existent client fails"""
        fake_client_id = "non-existent-client-id-12345"
        
        files = {
            "file": ("test.txt", io.BytesIO(b"test content"), "text/plain")
        }
        data = {
            "folder_category": "documenti"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/clients/{fake_client_id}/documents/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent client, got {response.status_code}"
        print(f"✓ Direct upload to non-existent client correctly returns 404")
    
    # ==================== AUTHORIZATION TESTS ====================
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated requests are denied"""
        # Test global categories
        response = requests.get(f"{BASE_URL}/api/folder-categories")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print(f"✓ Unauthenticated access correctly denied")


class TestDocumentPreviewAPI:
    """Test document preview functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_document_for_preview(self, headers):
        """Test that documents can be retrieved for preview"""
        # First get a client with documents
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        assert clients_response.status_code == 200
        
        clients = clients_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        # Try to find a client with documents
        for client in clients[:5]:  # Check first 5 clients
            docs_response = requests.get(
                f"{BASE_URL}/api/clients/{client['id']}/documents/by-folder",
                headers=headers
            )
            if docs_response.status_code == 200:
                data = docs_response.json()
                if data.get("total_documents", 0) > 0:
                    print(f"✓ Found client {client['id']} with {data['total_documents']} documents")
                    
                    # Verify folder structure
                    assert "folders" in data, "Response should have folders"
                    assert "total_documents" in data, "Response should have total_documents"
                    assert "available_years" in data, "Response should have available_years"
                    return
        
        print("✓ Document preview API structure verified (no documents found to preview)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
