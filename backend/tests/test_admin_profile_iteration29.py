"""
Test Admin Profile Feature - Iteration 29
Tests for personal profile section for Admin/Super Admin:
- PUT /api/admin/profile - Update first_name, last_name, phone
- PUT /api/admin/change-password - Verify current password and update
- POST /api/admin/upload-profile-image - Upload profile image
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
SUPER_ADMIN_PASSWORD = "Lanzarote1"


class TestAdminProfileFeature:
    """Tests for Admin Profile endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as super admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        self.token = data["access_token"]
        self.user = data["user"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
        
        # Cleanup - restore original profile data
        self.session.put(f"{BASE_URL}/api/admin/profile", json={
            "first_name": "Francesco",
            "last_name": "De Liso"
        })
    
    # ==================== PUT /api/admin/profile ====================
    
    def test_update_profile_first_name(self):
        """Test updating first_name via PUT /api/admin/profile"""
        response = self.session.put(f"{BASE_URL}/api/admin/profile", json={
            "first_name": "TestFirstName"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "user" in data
        assert data["user"]["first_name"] == "TestFirstName"
        print("✓ PUT /api/admin/profile - first_name update works")
    
    def test_update_profile_last_name(self):
        """Test updating last_name via PUT /api/admin/profile"""
        response = self.session.put(f"{BASE_URL}/api/admin/profile", json={
            "last_name": "TestLastName"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "user" in data
        assert data["user"]["last_name"] == "TestLastName"
        print("✓ PUT /api/admin/profile - last_name update works")
    
    def test_update_profile_phone(self):
        """Test updating phone via PUT /api/admin/profile"""
        response = self.session.put(f"{BASE_URL}/api/admin/profile", json={
            "phone": "+34 612 345 678"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "user" in data
        assert data["user"]["phone"] == "+34 612 345 678"
        print("✓ PUT /api/admin/profile - phone update works")
    
    def test_update_profile_all_fields(self):
        """Test updating all profile fields at once"""
        response = self.session.put(f"{BASE_URL}/api/admin/profile", json={
            "first_name": "TestFirst",
            "last_name": "TestLast",
            "phone": "+34 999 888 777"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["user"]["first_name"] == "TestFirst"
        assert data["user"]["last_name"] == "TestLast"
        assert data["user"]["phone"] == "+34 999 888 777"
        # full_name should be updated automatically
        assert data["user"]["full_name"] == "TestFirst TestLast"
        print("✓ PUT /api/admin/profile - all fields update works, full_name auto-updated")
    
    def test_update_profile_empty_data(self):
        """Test updating profile with no data returns 400"""
        response = self.session.put(f"{BASE_URL}/api/admin/profile", json={})
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ PUT /api/admin/profile - empty data returns 400")
    
    def test_update_profile_unauthorized(self):
        """Test updating profile without auth returns 401/403"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.put(f"{BASE_URL}/api/admin/profile", json={
            "first_name": "Unauthorized"
        })
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ PUT /api/admin/profile - unauthorized returns 401/403")
    
    # ==================== PUT /api/admin/change-password ====================
    
    def test_change_password_wrong_current(self):
        """Test change password with wrong current password returns 400"""
        response = self.session.put(f"{BASE_URL}/api/admin/change-password", json={
            "current_password": "WrongPassword123",
            "new_password": "NewPassword123"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "attuale" in data["detail"].lower() or "corretta" in data["detail"].lower()
        print("✓ PUT /api/admin/change-password - wrong current password returns 400")
    
    def test_change_password_short_new(self):
        """Test change password with short new password returns 400"""
        response = self.session.put(f"{BASE_URL}/api/admin/change-password", json={
            "current_password": SUPER_ADMIN_PASSWORD,
            "new_password": "short"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "8" in data["detail"] or "caratteri" in data["detail"].lower()
        print("✓ PUT /api/admin/change-password - short password returns 400")
    
    def test_change_password_success(self):
        """Test successful password change and revert"""
        new_password = "NewTestPassword123"
        
        # Change password
        response = self.session.put(f"{BASE_URL}/api/admin/change-password", json={
            "current_password": SUPER_ADMIN_PASSWORD,
            "new_password": new_password
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print("✓ PUT /api/admin/change-password - password changed successfully")
        
        # Verify new password works by logging in
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": new_password
        })
        assert login_response.status_code == 200, "Login with new password failed"
        print("✓ Login with new password works")
        
        # Revert password back to original
        new_token = login_response.json()["access_token"]
        revert_response = requests.put(
            f"{BASE_URL}/api/admin/change-password",
            json={
                "current_password": new_password,
                "new_password": SUPER_ADMIN_PASSWORD
            },
            headers={"Authorization": f"Bearer {new_token}", "Content-Type": "application/json"}
        )
        assert revert_response.status_code == 200, "Password revert failed"
        print("✓ Password reverted to original")
    
    def test_change_password_unauthorized(self):
        """Test change password without auth returns 401/403"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.put(f"{BASE_URL}/api/admin/change-password", json={
            "current_password": "test",
            "new_password": "newtest123"
        })
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ PUT /api/admin/change-password - unauthorized returns 401/403")
    
    # ==================== POST /api/admin/upload-profile-image ====================
    
    def test_upload_profile_image_success(self):
        """Test uploading profile image"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        # Minimal valid PNG (1x1 transparent pixel)
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test_image.png', png_data, 'image/png')
        }
        
        # Remove Content-Type header for multipart
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/upload-profile-image",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "profile_image" in data
        assert data["profile_image"].startswith("data:image/png;base64,")
        print("✓ POST /api/admin/upload-profile-image - image uploaded successfully")
    
    def test_upload_profile_image_non_image(self):
        """Test uploading non-image file returns 400"""
        files = {
            'file': ('test.txt', b'This is not an image', 'text/plain')
        }
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/upload-profile-image",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ POST /api/admin/upload-profile-image - non-image returns 400")
    
    def test_upload_profile_image_unauthorized(self):
        """Test uploading profile image without auth returns 401/403"""
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test_image.png', png_data, 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/upload-profile-image",
            files=files
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ POST /api/admin/upload-profile-image - unauthorized returns 401/403")
    
    # ==================== GET /api/auth/me - Verify profile data ====================
    
    def test_get_me_returns_profile_fields(self):
        """Test GET /api/auth/me returns profile fields including profile_image"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify required fields exist
        assert "id" in data
        assert "email" in data
        assert "full_name" in data
        assert "role" in data
        assert data["role"] in ["super_admin", "admin"]
        
        # Verify profile fields
        assert "first_name" in data
        assert "last_name" in data
        
        print(f"✓ GET /api/auth/me - returns profile data: {data['first_name']} {data['last_name']}, role={data['role']}")
    
    def test_remove_profile_image(self):
        """Test removing profile image via PUT /api/admin/profile"""
        response = self.session.put(f"{BASE_URL}/api/admin/profile", json={
            "profile_image": ""
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # profile_image should be empty or None
        assert data["user"].get("profile_image") in ["", None]
        print("✓ PUT /api/admin/profile - profile_image removal works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
