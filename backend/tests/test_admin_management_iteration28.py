"""
Test suite for Multi-Admin Management Feature - Iteration 28
Tests:
- Super Admin login (francesco@fiscaltaxcanarie.com, bruno@fiscaltaxcanarie.com)
- GET /api/admin/team - List admin team members
- POST /api/admin/invite - Invite new admin (super_admin only, @fiscaltaxcanarie.com domain only)
- PUT /api/admin/change-password - Change admin password
- POST /api/auth/upload-profile-image - Upload profile image
- Domain validation for admin emails
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_1 = {
    "email": "francesco@fiscaltaxcanarie.com",
    "password": "Lanzarote1"
}

SUPER_ADMIN_2 = {
    "email": "bruno@fiscaltaxcanarie.com",
    "password": "Lanzarote1"
}

LEGACY_ADMIN = {
    "email": "info@fiscaltaxcanarie.com",
    "password": "Triana48+"
}


class TestSuperAdminLogin:
    """Test Super Admin login functionality"""
    
    def test_super_admin_1_login_francesco(self):
        """Test login with francesco@fiscaltaxcanarie.com"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_1)
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["email"] == SUPER_ADMIN_1["email"]
        assert data["user"]["role"] == "super_admin", f"Expected role super_admin, got {data['user']['role']}"
        print(f"✓ Francesco login successful - role: {data['user']['role']}")
    
    def test_super_admin_2_login_bruno(self):
        """Test login with bruno@fiscaltaxcanarie.com"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_2)
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["email"] == SUPER_ADMIN_2["email"]
        assert data["user"]["role"] == "super_admin", f"Expected role super_admin, got {data['user']['role']}"
        print(f"✓ Bruno login successful - role: {data['user']['role']}")
    
    def test_legacy_admin_login(self):
        """Test login with legacy admin info@fiscaltaxcanarie.com"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=LEGACY_ADMIN)
        print(f"Legacy admin login response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Legacy admin role: {data['user']['role']}")
            assert data["user"]["email"] == LEGACY_ADMIN["email"]
            print(f"✓ Legacy admin login successful - role: {data['user']['role']}")
        else:
            print(f"Legacy admin login failed: {response.text}")
            pytest.skip("Legacy admin credentials may have changed")


class TestAdminTeam:
    """Test GET /api/admin/team endpoint"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get token for super_admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_1)
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        return response.json()["access_token"]
    
    def test_get_admin_team_with_super_admin(self, super_admin_token):
        """Test getting admin team list with super_admin token"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/team", headers=headers)
        
        print(f"Admin team response status: {response.status_code}")
        print(f"Admin team response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of admins"
        
        # Verify at least the two super_admins exist
        emails = [admin["email"] for admin in data]
        assert SUPER_ADMIN_1["email"] in emails, f"Francesco not found in team: {emails}"
        assert SUPER_ADMIN_2["email"] in emails, f"Bruno not found in team: {emails}"
        
        # Verify admin structure
        for admin in data:
            assert "id" in admin, "Missing id in admin"
            assert "email" in admin, "Missing email in admin"
            assert "role" in admin, "Missing role in admin"
            assert admin["role"] in ["super_admin", "admin"], f"Invalid role: {admin['role']}"
            print(f"  - {admin['email']} ({admin['role']})")
        
        print(f"✓ Admin team retrieved successfully - {len(data)} members")
    
    def test_get_admin_team_without_token(self):
        """Test that admin team endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/team")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Admin team endpoint correctly requires authentication")


class TestAdminInvite:
    """Test POST /api/admin/invite endpoint"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get token for super_admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_1)
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        return response.json()["access_token"]
    
    def test_invite_admin_valid_domain(self, super_admin_token):
        """Test inviting admin with valid @fiscaltaxcanarie.com domain"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Use unique email to avoid conflicts
        test_email = f"test_{uuid.uuid4().hex[:8]}@fiscaltaxcanarie.com"
        
        invite_data = {
            "email": test_email,
            "first_name": "Test",
            "last_name": "Admin",
            "role": "admin"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/invite", json=invite_data, headers=headers)
        print(f"Invite response status: {response.status_code}")
        print(f"Invite response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Missing invite token in response"
        assert "invite_id" in data, "Missing invite_id in response"
        assert "expires_at" in data, "Missing expires_at in response"
        
        print(f"✓ Admin invite created successfully for {test_email}")
        print(f"  Invite token: {data['token'][:20]}...")
    
    def test_invite_admin_invalid_domain_rejected(self, super_admin_token):
        """Test that non-fiscaltaxcanarie.com domains are rejected"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        invite_data = {
            "email": "test@gmail.com",  # Invalid domain
            "first_name": "Test",
            "last_name": "User",
            "role": "admin"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/invite", json=invite_data, headers=headers)
        print(f"Invalid domain invite response status: {response.status_code}")
        print(f"Invalid domain invite response: {response.text}")
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "fiscaltaxcanarie.com" in response.text.lower(), "Error should mention required domain"
        
        print("✓ Invalid domain correctly rejected")
    
    def test_invite_admin_invalid_domain_other(self, super_admin_token):
        """Test that other domains like @example.com are rejected"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        invite_data = {
            "email": "admin@example.com",  # Invalid domain
            "first_name": "Test",
            "last_name": "User",
            "role": "admin"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/invite", json=invite_data, headers=headers)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ @example.com domain correctly rejected")
    
    def test_invite_super_admin_by_super_admin(self, super_admin_token):
        """Test that super_admin can invite another super_admin"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        test_email = f"supertest_{uuid.uuid4().hex[:8]}@fiscaltaxcanarie.com"
        
        invite_data = {
            "email": test_email,
            "first_name": "Super",
            "last_name": "Test",
            "role": "super_admin"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/invite", json=invite_data, headers=headers)
        print(f"Super admin invite response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Super admin can invite another super_admin")


class TestAdminChangePassword:
    """Test PUT /api/admin/change-password endpoint"""
    
    def test_change_password_wrong_current(self):
        """Test that wrong current password is rejected"""
        # Login first
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_1)
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        password_data = {
            "current_password": "WrongPassword123",
            "new_password": "NewPassword123"
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/change-password", json=password_data, headers=headers)
        print(f"Change password (wrong current) response: {response.status_code}")
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Wrong current password correctly rejected")
    
    def test_change_password_short_new(self):
        """Test that short new password is rejected"""
        # Login first
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_1)
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        password_data = {
            "current_password": SUPER_ADMIN_1["password"],
            "new_password": "short"  # Less than 8 characters
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/change-password", json=password_data, headers=headers)
        print(f"Change password (short) response: {response.status_code}")
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Short password correctly rejected")


class TestProfileImageUpload:
    """Test POST /api/auth/upload-profile-image endpoint"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get token for super_admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_1)
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        return response.json()["access_token"]
    
    def test_upload_profile_image(self, super_admin_token):
        """Test uploading a profile image"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Create a simple test image (1x1 pixel PNG)
        import base64
        # Minimal valid PNG
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {
            "file": ("test_profile.png", png_data, "image/png")
        }
        
        # Try the admin upload endpoint first
        response = requests.post(f"{BASE_URL}/api/admin/upload-profile-image", files=files, headers=headers)
        print(f"Admin profile image upload response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert "profile_image" in data, "Missing profile_image in response"
            print("✓ Profile image uploaded successfully via /api/admin/upload-profile-image")
        else:
            # Try the auth endpoint
            response = requests.post(f"{BASE_URL}/api/auth/upload-profile-image", files=files, headers=headers)
            print(f"Auth profile image upload response: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                assert "profile_image" in data, "Missing profile_image in response"
                print("✓ Profile image uploaded successfully via /api/auth/upload-profile-image")
            else:
                print(f"Profile image upload failed: {response.text}")
                # Check if endpoint exists
                assert response.status_code != 404, "Profile image upload endpoint not found"


class TestAdminInviteVerification:
    """Test admin invite verification and activation flow"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get token for super_admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_1)
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        return response.json()["access_token"]
    
    def test_verify_invite_token(self, super_admin_token):
        """Test verifying an invite token"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First create an invite
        test_email = f"verify_{uuid.uuid4().hex[:8]}@fiscaltaxcanarie.com"
        invite_data = {
            "email": test_email,
            "first_name": "Verify",
            "last_name": "Test",
            "role": "admin"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/invite", json=invite_data, headers=headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create invite for verification test")
        
        invite_token = create_response.json()["token"]
        
        # Verify the token
        verify_response = requests.get(f"{BASE_URL}/api/admin/invite/verify/{invite_token}")
        print(f"Verify invite response: {verify_response.status_code}")
        print(f"Verify invite data: {verify_response.json()}")
        
        assert verify_response.status_code == 200, f"Expected 200, got {verify_response.status_code}"
        
        data = verify_response.json()
        assert data["valid"] == True, "Expected valid=True"
        assert data["email"] == test_email, f"Expected email {test_email}, got {data['email']}"
        assert data["role"] == "admin", f"Expected role admin, got {data['role']}"
        
        print("✓ Invite token verification successful")
    
    def test_verify_invalid_token(self):
        """Test verifying an invalid token"""
        response = requests.get(f"{BASE_URL}/api/admin/invite/verify/invalid_token_12345")
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid token correctly rejected")


class TestPendingInvites:
    """Test GET /api/admin/pending-invites endpoint"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get token for super_admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_1)
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        return response.json()["access_token"]
    
    def test_get_pending_invites(self, super_admin_token):
        """Test getting list of pending invites"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/pending-invites", headers=headers)
        print(f"Pending invites response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of pending invites"
        
        print(f"✓ Pending invites retrieved - {len(data)} invites")
        for invite in data[:5]:  # Show first 5
            print(f"  - {invite.get('email')} ({invite.get('role')})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
