"""
Test suite for Declarations (Dichiarazioni) feature - Iteration 22
Tests API endpoints for declaration types and tax returns
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "info@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Triana48+"


class TestDeclarationsAPI:
    """Test suite for Declarations API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token")
            self.user = data.get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    # ==================== DECLARATION TYPES TESTS ====================
    
    def test_get_declaration_types_success(self):
        """Test GET /api/declarations/types - should return list of declaration types"""
        response = self.session.get(f"{BASE_URL}/api/declarations/types")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Should have at least the default type
        if len(data) > 0:
            first_type = data[0]
            assert "id" in first_type, "Declaration type should have id"
            assert "code" in first_type, "Declaration type should have code"
            assert "name" in first_type, "Declaration type should have name"
            assert "is_active" in first_type, "Declaration type should have is_active"
            print(f"Found {len(data)} declaration types")
            print(f"First type: {first_type.get('name')} ({first_type.get('code')})")
    
    def test_get_declaration_types_creates_default(self):
        """Test that default declaration type is created if none exist"""
        response = self.session.get(f"{BASE_URL}/api/declarations/types")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have at least one type (default)
        assert len(data) >= 1, "Should have at least one declaration type"
        
        # Check default type structure
        default_type = next((t for t in data if t.get("code") == "redditi"), None)
        if default_type:
            assert default_type["name"] == "Dichiarazione dei Redditi"
            assert default_type["is_active"] == True
            print("Default 'redditi' type found and verified")
    
    # ==================== TAX RETURNS TESTS ====================
    
    def test_get_tax_returns_admin_success(self):
        """Test GET /api/declarations/tax-returns - admin should see all returns"""
        response = self.session.get(f"{BASE_URL}/api/declarations/tax-returns")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Admin sees {len(data)} tax returns")
    
    def test_get_tax_returns_with_filters(self):
        """Test GET /api/declarations/tax-returns with query filters"""
        # Test with anno_fiscale filter
        response = self.session.get(f"{BASE_URL}/api/declarations/tax-returns?anno_fiscale=2025")
        assert response.status_code == 200
        
        # Test with stato filter
        response = self.session.get(f"{BASE_URL}/api/declarations/tax-returns?stato=bozza")
        assert response.status_code == 200
        
        # Test with multiple filters
        response = self.session.get(f"{BASE_URL}/api/declarations/tax-returns?anno_fiscale=2025&stato=bozza")
        assert response.status_code == 200
        
        print("Filter queries working correctly")
    
    def test_admin_cannot_create_tax_return(self):
        """Test POST /api/declarations/tax-returns - admin should not be able to create"""
        response = self.session.post(f"{BASE_URL}/api/declarations/tax-returns", json={
            "anno_fiscale": 2025,
            "tipo_dichiarazione": "individual"
        })
        
        # Admin should get 400 error
        assert response.status_code == 400, f"Expected 400 for admin creating tax return, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print(f"Admin correctly blocked from creating tax return: {data.get('detail')}")
    
    # ==================== AUTHORIZATION TEXT TEST ====================
    
    def test_get_authorization_text_requires_valid_return(self):
        """Test GET /api/declarations/tax-returns/{id}/authorization-text with invalid ID"""
        response = self.session.get(f"{BASE_URL}/api/declarations/tax-returns/invalid-id/authorization-text")
        
        # Should return 404 for non-existent return
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Authorization text endpoint correctly returns 404 for invalid ID")
    
    # ==================== AUTHENTICATION TESTS ====================
    
    def test_declaration_types_requires_auth(self):
        """Test that declaration types endpoint requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/declarations/types")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("Declaration types endpoint correctly requires authentication")
    
    def test_tax_returns_requires_auth(self):
        """Test that tax returns endpoint requires authentication"""
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/declarations/tax-returns")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("Tax returns endpoint correctly requires authentication")


class TestDeclarationTypesAdmin:
    """Test admin-only operations on declaration types"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Admin authentication failed")
    
    def test_create_declaration_type_success(self):
        """Test POST /api/declarations/types - admin can create new type"""
        import uuid
        unique_code = f"test_{uuid.uuid4().hex[:8]}"
        
        response = self.session.post(f"{BASE_URL}/api/declarations/types", json={
            "code": unique_code,
            "name": "Test Declaration Type",
            "description": "Test description",
            "icon": "file-text",
            "color": "#0d9488",
            "is_active": True,
            "order": 99
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["code"] == unique_code
        assert data["name"] == "Test Declaration Type"
        assert "id" in data
        
        # Store for cleanup
        self.created_type_id = data["id"]
        print(f"Created declaration type: {data['name']} (ID: {data['id']})")
        
        # Cleanup - delete the created type
        delete_response = self.session.delete(f"{BASE_URL}/api/declarations/types/{self.created_type_id}")
        assert delete_response.status_code == 200
        print("Cleaned up test declaration type")
    
    def test_create_duplicate_type_fails(self):
        """Test POST /api/declarations/types - duplicate code should fail"""
        # First, get existing types
        types_response = self.session.get(f"{BASE_URL}/api/declarations/types")
        types = types_response.json()
        
        if len(types) > 0:
            existing_code = types[0]["code"]
            
            response = self.session.post(f"{BASE_URL}/api/declarations/types", json={
                "code": existing_code,
                "name": "Duplicate Test",
                "is_active": True,
                "order": 99
            })
            
            assert response.status_code == 400, f"Expected 400 for duplicate code, got {response.status_code}"
            print(f"Duplicate code '{existing_code}' correctly rejected")


class TestTaxReturnListItem:
    """Test tax return list item structure"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_tax_return_list_structure(self):
        """Test that tax return list items have correct structure"""
        response = self.session.get(f"{BASE_URL}/api/declarations/tax-returns")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            item = data[0]
            # Check required fields
            required_fields = [
                "id", "client_id", "client_name", "anno_fiscale",
                "tipo_dichiarazione", "stato", "created_at", "updated_at"
            ]
            for field in required_fields:
                assert field in item, f"Missing field: {field}"
            
            # Check indicator fields
            indicator_fields = [
                "has_rentas_trabajo", "has_autonomo", "has_inmuebles",
                "has_alquileres", "has_inversiones", "has_criptomonedas",
                "has_ganancias", "has_deducciones_canarias"
            ]
            for field in indicator_fields:
                assert field in item, f"Missing indicator field: {field}"
            
            print(f"Tax return list item structure verified: {item.get('id')}")
        else:
            print("No tax returns found - structure test skipped (empty list is valid)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
