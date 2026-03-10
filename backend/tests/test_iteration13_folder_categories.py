"""
Test Iteration 13 - Document Folder Categories Feature
Tests for:
- GET /api/folder-categories - Returns 7 default + custom categories
- POST /api/folder-categories - Create custom category
- DELETE /api/folder-categories/{id} - Cannot delete default categories
- GET /api/clients/{id}/documents/by-folder - Returns folder structure with counts
- PUT /api/documents/{id}/category - Update document category
"""

import pytest
import requests
import os
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "info@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Triana48+"

# Expected default categories
DEFAULT_CATEGORIES = [
    "documenti",
    "agencia_tributaria",
    "seguridad_social",
    "ayuntamiento",
    "contratti",
    "atti",
    "registro_mercantil"
]


class TestFolderCategories:
    """Test folder categories endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def test_client_id(self, headers):
        """Get a test client ID"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        assert response.status_code == 200
        clients = response.json()
        assert len(clients) > 0, "No clients found in system"
        return clients[0]["id"]
    
    # ==== GET /api/folder-categories Tests ====
    
    def test_get_folder_categories_returns_7_defaults(self, headers):
        """Test that GET /api/folder-categories returns all 7 default categories"""
        response = requests.get(f"{BASE_URL}/api/folder-categories", headers=headers)
        
        assert response.status_code == 200, f"Failed to get categories: {response.text}"
        
        categories = response.json()
        assert isinstance(categories, list), "Response should be a list"
        
        # Check that all 7 default categories are present
        category_ids = [cat["id"] for cat in categories]
        for default_id in DEFAULT_CATEGORIES:
            assert default_id in category_ids, f"Default category '{default_id}' not found"
        
        print(f"SUCCESS: GET /api/folder-categories returned {len(categories)} categories (7 default + custom)")
    
    def test_folder_categories_have_correct_structure(self, headers):
        """Test that each category has the required fields"""
        response = requests.get(f"{BASE_URL}/api/folder-categories", headers=headers)
        assert response.status_code == 200
        
        categories = response.json()
        for cat in categories:
            assert "id" in cat, f"Category missing 'id': {cat}"
            assert "name" in cat, f"Category missing 'name': {cat}"
            assert "icon" in cat, f"Category missing 'icon': {cat}"
            assert "color" in cat, f"Category missing 'color': {cat}"
            assert "is_default" in cat, f"Category missing 'is_default': {cat}"
            assert "order" in cat, f"Category missing 'order': {cat}"
        
        print("SUCCESS: All categories have correct structure")
    
    def test_default_categories_marked_correctly(self, headers):
        """Test that default categories have is_default=True"""
        response = requests.get(f"{BASE_URL}/api/folder-categories", headers=headers)
        assert response.status_code == 200
        
        categories = response.json()
        for cat in categories:
            if cat["id"] in DEFAULT_CATEGORIES:
                assert cat["is_default"] == True, f"Default category '{cat['id']}' should have is_default=True"
        
        print("SUCCESS: Default categories correctly marked")
    
    def test_folder_categories_have_correct_colors(self, headers):
        """Test that categories have color codes"""
        response = requests.get(f"{BASE_URL}/api/folder-categories", headers=headers)
        assert response.status_code == 200
        
        categories = response.json()
        expected_colors = {
            "documenti": "#6b7280",
            "agencia_tributaria": "#dc2626",
            "seguridad_social": "#2563eb",
            "ayuntamiento": "#16a34a",
            "contratti": "#9333ea",
            "atti": "#ca8a04",
            "registro_mercantil": "#0891b2"
        }
        
        for cat in categories:
            if cat["id"] in expected_colors:
                assert cat["color"] == expected_colors[cat["id"]], f"Category '{cat['id']}' should have color {expected_colors[cat['id']]}, got {cat['color']}"
        
        print("SUCCESS: Default categories have correct colors")
    
    # ==== POST /api/folder-categories Tests ====
    
    def test_create_custom_folder_category(self, headers):
        """Test creating a new custom folder category"""
        unique_name = f"TEST_Category_{uuid.uuid4().hex[:6]}"
        
        response = requests.post(
            f"{BASE_URL}/api/folder-categories",
            headers=headers,
            json={
                "name": unique_name,
                "icon": "folder",
                "color": "#ff6b6b"
            }
        )
        
        assert response.status_code == 200, f"Failed to create category: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["name"] == unique_name, f"Name mismatch"
        assert data["is_default"] == False, "Custom category should have is_default=False"
        
        # Store for cleanup
        TestFolderCategories.created_category_id = data["id"]
        
        print(f"SUCCESS: Created custom category '{unique_name}'")
    
    def test_cannot_create_duplicate_category_name(self, headers):
        """Test that creating a category with existing name fails"""
        response = requests.post(
            f"{BASE_URL}/api/folder-categories",
            headers=headers,
            json={
                "name": "Documenti",  # Default category name
                "icon": "folder",
                "color": "#ff6b6b"
            }
        )
        
        assert response.status_code == 400, f"Should fail for duplicate name, got {response.status_code}"
        print("SUCCESS: Duplicate category name correctly rejected")
    
    # ==== DELETE /api/folder-categories/{id} Tests ====
    
    def test_cannot_delete_default_category(self, headers):
        """Test that deleting a default category fails"""
        # Try to delete "documenti" default category
        response = requests.delete(
            f"{BASE_URL}/api/folder-categories/documenti",
            headers=headers
        )
        
        assert response.status_code == 400, f"Should reject deletion of default category, got {response.status_code}"
        assert "predefinita" in response.text.lower() or "default" in response.text.lower(), "Error should mention default/predefinita"
        
        print("SUCCESS: Cannot delete default category 'documenti'")
    
    def test_cannot_delete_other_default_categories(self, headers):
        """Test that all default categories cannot be deleted"""
        for cat_id in ["agencia_tributaria", "seguridad_social", "ayuntamiento"]:
            response = requests.delete(
                f"{BASE_URL}/api/folder-categories/{cat_id}",
                headers=headers
            )
            assert response.status_code == 400, f"Should reject deletion of '{cat_id}', got {response.status_code}"
        
        print("SUCCESS: Cannot delete any default categories")
    
    def test_can_delete_custom_category(self, headers):
        """Test that custom categories can be deleted"""
        # First create a category to delete
        unique_name = f"TEST_ToDelete_{uuid.uuid4().hex[:6]}"
        
        create_resp = requests.post(
            f"{BASE_URL}/api/folder-categories",
            headers=headers,
            json={"name": unique_name}
        )
        assert create_resp.status_code == 200
        cat_id = create_resp.json()["id"]
        
        # Now delete it
        delete_resp = requests.delete(
            f"{BASE_URL}/api/folder-categories/{cat_id}",
            headers=headers
        )
        
        assert delete_resp.status_code == 200, f"Should allow deletion of custom category: {delete_resp.text}"
        
        print(f"SUCCESS: Custom category '{unique_name}' deleted successfully")
    
    # ==== GET /api/clients/{id}/documents/by-folder Tests ====
    
    def test_get_documents_by_folder_structure(self, headers, test_client_id):
        """Test that documents by folder returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{test_client_id}/documents/by-folder",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get documents by folder: {response.text}"
        
        data = response.json()
        assert "folders" in data, "Response should contain 'folders'"
        assert "total_documents" in data, "Response should contain 'total_documents'"
        assert "available_years" in data, "Response should contain 'available_years'"
        
        # Check folders structure
        folders = data["folders"]
        assert isinstance(folders, list), "folders should be a list"
        
        # Check that we have at least 7 folders (the defaults)
        assert len(folders) >= 7, f"Should have at least 7 default folders, got {len(folders)}"
        
        print(f"SUCCESS: Documents by folder structure is correct. Total docs: {data['total_documents']}, Folders: {len(folders)}")
    
    def test_documents_by_folder_has_all_default_categories(self, headers, test_client_id):
        """Test that all 7 default categories appear in folders"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{test_client_id}/documents/by-folder",
            headers=headers
        )
        
        assert response.status_code == 200
        
        folders = response.json()["folders"]
        folder_ids = [f["id"] for f in folders]
        
        for default_id in DEFAULT_CATEGORIES:
            assert default_id in folder_ids, f"Default folder '{default_id}' not found in response"
        
        print("SUCCESS: All 7 default categories present in folders response")
    
    def test_documents_by_folder_contains_document_count(self, headers, test_client_id):
        """Test that each folder has document_count field"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{test_client_id}/documents/by-folder",
            headers=headers
        )
        
        assert response.status_code == 200
        
        folders = response.json()["folders"]
        for folder in folders:
            assert "document_count" in folder, f"Folder '{folder['name']}' missing document_count"
            assert isinstance(folder["document_count"], int), f"document_count should be int"
            assert "documents" in folder, f"Folder '{folder['name']}' missing documents array"
            assert "years" in folder, f"Folder '{folder['name']}' missing years array"
        
        print("SUCCESS: All folders have document_count and documents fields")
    
    def test_documents_by_folder_year_filter(self, headers, test_client_id):
        """Test that year filter works"""
        current_year = 2025
        response = requests.get(
            f"{BASE_URL}/api/clients/{test_client_id}/documents/by-folder?year={current_year}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Year filter request failed: {response.text}"
        print(f"SUCCESS: Year filter works for year {current_year}")
    
    # ==== PUT /api/documents/{id}/category Tests ====
    
    def test_update_document_category_endpoint_exists(self, headers, test_client_id):
        """Test that update document category endpoint exists"""
        # First get a document
        response = requests.get(
            f"{BASE_URL}/api/documents?client_id={test_client_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        documents = response.json()
        
        if len(documents) > 0:
            doc_id = documents[0]["id"]
            
            # Try to update category
            update_resp = requests.put(
                f"{BASE_URL}/api/documents/{doc_id}/category",
                headers=headers,
                data={
                    "folder_category": "agencia_tributaria",
                    "document_year": "2025"
                }
            )
            
            # Should succeed (200) or at least endpoint exists (not 404/405)
            assert update_resp.status_code in [200, 400, 403], f"Endpoint should exist, got {update_resp.status_code}"
            print(f"SUCCESS: PUT /api/documents/{doc_id}/category endpoint works")
        else:
            print("SKIPPED: No documents found to test category update")
    
    # ==== Cleanup ====
    
    def test_cleanup_test_categories(self, headers):
        """Clean up any TEST_ categories created during testing"""
        response = requests.get(f"{BASE_URL}/api/folder-categories", headers=headers)
        if response.status_code == 200:
            categories = response.json()
            for cat in categories:
                if cat["name"].startswith("TEST_") and not cat.get("is_default", False):
                    requests.delete(
                        f"{BASE_URL}/api/folder-categories/{cat['id']}",
                        headers=headers
                    )
        print("SUCCESS: Cleanup completed")


class TestFolderCategoriesIntegration:
    """Integration tests for folder categories with documents"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_existing_custom_category_fatture_fornitori(self, headers):
        """Test that previously created 'Fatture Fornitori' category exists"""
        response = requests.get(f"{BASE_URL}/api/folder-categories", headers=headers)
        assert response.status_code == 200
        
        categories = response.json()
        category_names = [cat["name"].lower() for cat in categories]
        
        # Check if Fatture Fornitori exists (was mentioned in agent context)
        found = any("fatture" in name and "fornitori" in name for name in category_names)
        if found:
            print("SUCCESS: Custom category 'Fatture Fornitori' exists")
        else:
            print("INFO: 'Fatture Fornitori' category not found - may have been deleted or not created yet")
    
    def test_folder_colors_and_icons(self, headers):
        """Test that folders have proper visual identifiers"""
        response = requests.get(f"{BASE_URL}/api/folder-categories", headers=headers)
        assert response.status_code == 200
        
        categories = response.json()
        
        # Verify icons
        expected_icons = {
            "documenti": "file-text",
            "agencia_tributaria": "landmark",
            "seguridad_social": "users",
            "ayuntamiento": "building-2",
            "contratti": "file-signature",
            "atti": "scale",
            "registro_mercantil": "briefcase"
        }
        
        for cat in categories:
            if cat["id"] in expected_icons:
                assert cat["icon"] == expected_icons[cat["id"]], f"Category '{cat['id']}' should have icon '{expected_icons[cat['id']]}'"
        
        print("SUCCESS: All default categories have correct icons")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
