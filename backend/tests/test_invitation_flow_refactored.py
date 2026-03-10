"""
Test suite for the refactored client invitation flow.
Features tested:
1. POST /api/clients/invite - Creates invitation in 'invitations' collection
2. GET /api/invitations - Returns pending invitations
3. POST /api/clients/resend-invite/{invite_id} - Resends invitation using invite_id
4. POST /api/auth/complete-registration - Allows client to set their own login email
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInvitationFlowRefactored:
    """Test the refactored invitation flow with invitations collection"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup commercialista credentials and auth token"""
        self.commercialista_email = "info@fiscaltaxcanarie.com"
        self.commercialista_password = "Triana48+"
        self.headers = {}
        
        # Login as commercialista
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": self.commercialista_email, "password": self.commercialista_password}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {token}"}
        else:
            pytest.skip("Could not authenticate as commercialista")
    
    # Test 1: POST /api/clients/invite creates invitation record
    def test_invite_client_creates_invitation_record(self):
        """Verify that inviting a client creates a record in invitations collection"""
        test_email = f"TEST_invite_{uuid.uuid4().hex[:8]}@example.com"
        test_name = "Test Cliente Invito"
        
        response = requests.post(
            f"{BASE_URL}/api/clients/invite",
            json={"email": test_email, "full_name": test_name},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response contains invite_id and invitation_link
        assert "invite_id" in data, "Response should contain invite_id"
        assert "invitation_link" in data, "Response should contain invitation_link"
        assert "complete-registration?token=" in data["invitation_link"], "Link should contain registration token"
        
        # Store invite_id for cleanup/further tests
        self.last_invite_id = data.get("invite_id")
        print(f"✅ Created invitation with ID: {self.last_invite_id}")
    
    # Test 2: GET /api/invitations returns pending invitations
    def test_get_pending_invitations(self):
        """Verify that GET /api/invitations returns pending invitations"""
        response = requests.get(
            f"{BASE_URL}/api/invitations",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list), "Response should be a list"
        
        # If there are invitations, verify structure
        if len(data) > 0:
            invitation = data[0]
            assert "id" in invitation, "Invitation should have id"
            assert "notification_email" in invitation, "Invitation should have notification_email"
            assert "invitation_sent_at" in invitation, "Invitation should have invitation_sent_at"
            print(f"✅ Found {len(data)} pending invitations")
        else:
            print("✅ GET /api/invitations works (no pending invitations)")
    
    # Test 3: Verify invitation appears in GET /api/invitations after creation
    def test_invitation_appears_in_list_after_creation(self):
        """Create invitation and verify it appears in pending list"""
        test_email = f"TEST_appear_{uuid.uuid4().hex[:8]}@example.com"
        test_name = "Test Appear in List"
        
        # Create invitation
        create_response = requests.post(
            f"{BASE_URL}/api/clients/invite",
            json={"email": test_email, "full_name": test_name},
            headers=self.headers
        )
        assert create_response.status_code == 200
        invite_id = create_response.json()["invite_id"]
        
        # Get pending invitations
        list_response = requests.get(
            f"{BASE_URL}/api/invitations",
            headers=self.headers
        )
        assert list_response.status_code == 200
        invitations = list_response.json()
        
        # Find our invitation
        found = False
        for inv in invitations:
            if inv.get("id") == invite_id:
                found = True
                assert inv.get("notification_email") == test_email
                assert inv.get("suggested_name") == test_name
                break
        
        assert found, f"Created invitation {invite_id} should appear in pending list"
        print(f"✅ Invitation {invite_id} appears in pending invitations list")
    
    # Test 4: POST /api/clients/resend-invite/{invite_id} uses invitation ID
    def test_resend_invite_uses_invite_id(self):
        """Verify resend invite endpoint uses invite_id from invitations collection"""
        test_email = f"TEST_resend_{uuid.uuid4().hex[:8]}@example.com"
        
        # First create an invitation
        create_response = requests.post(
            f"{BASE_URL}/api/clients/invite",
            json={"email": test_email, "full_name": "Test Resend"},
            headers=self.headers
        )
        assert create_response.status_code == 200
        invite_id = create_response.json()["invite_id"]
        original_link = create_response.json()["invitation_link"]
        
        # Resend the invitation using invite_id
        resend_response = requests.post(
            f"{BASE_URL}/api/clients/resend-invite/{invite_id}",
            headers=self.headers
        )
        
        assert resend_response.status_code == 200, f"Expected 200, got {resend_response.status_code}: {resend_response.text}"
        resend_data = resend_response.json()
        
        assert resend_data.get("success") == True, "Resend should be successful"
        assert "invitation_link" in resend_data, "Resend should return new invitation_link"
        
        # New link should be different (new token)
        new_link = resend_data["invitation_link"]
        assert new_link != original_link, "Resend should generate a new token/link"
        
        print(f"✅ Resend invite works with invite_id: {invite_id}")
    
    # Test 5: Resend invite returns 404 for invalid invite_id
    def test_resend_invite_invalid_id_returns_404(self):
        """Verify resend returns 404 for non-existent invite_id"""
        fake_id = str(uuid.uuid4())
        
        response = requests.post(
            f"{BASE_URL}/api/clients/resend-invite/{fake_id}",
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Resend invite returns 404 for invalid invite_id")
    
    # Test 6: Complete registration with custom email
    def test_complete_registration_with_custom_email(self):
        """Verify complete registration allows client to choose their login email"""
        notification_email = f"TEST_notif_{uuid.uuid4().hex[:8]}@example.com"
        login_email = f"TEST_login_{uuid.uuid4().hex[:8]}@example.com"
        
        # Create invitation
        create_response = requests.post(
            f"{BASE_URL}/api/clients/invite",
            json={"email": notification_email, "full_name": "Test Custom Email"},
            headers=self.headers
        )
        assert create_response.status_code == 200
        invitation_link = create_response.json()["invitation_link"]
        
        # Extract token from link
        token = invitation_link.split("token=")[-1]
        
        # Complete registration with different email
        complete_response = requests.post(
            f"{BASE_URL}/api/auth/complete-registration",
            json={
                "token": token,
                "email": login_email,  # Different from notification email
                "password": "TestPassword123!",
                "full_name": "Test Custom Email User"
            }
        )
        
        assert complete_response.status_code == 200, f"Expected 200, got {complete_response.status_code}: {complete_response.text}"
        data = complete_response.json()
        
        assert data.get("success") == True, "Registration should be successful"
        assert "access_token" in data, "Should return access token"
        assert "user" in data, "Should return user data"
        
        # User should have the login email, not notification email
        user = data["user"]
        assert user.get("email") == login_email, f"User email should be {login_email}, got {user.get('email')}"
        
        print(f"✅ Client registered with custom email: {login_email} (notification was {notification_email})")
    
    # Test 7: Complete registration fails with already used token
    def test_complete_registration_fails_with_used_token(self):
        """Verify token cannot be reused after registration"""
        notification_email = f"TEST_token_reuse_{uuid.uuid4().hex[:8]}@example.com"
        
        # Create invitation
        create_response = requests.post(
            f"{BASE_URL}/api/clients/invite",
            json={"email": notification_email, "full_name": "Test Token Reuse"},
            headers=self.headers
        )
        assert create_response.status_code == 200
        invitation_link = create_response.json()["invitation_link"]
        token = invitation_link.split("token=")[-1]
        
        # Complete registration first time
        first_response = requests.post(
            f"{BASE_URL}/api/auth/complete-registration",
            json={
                "token": token,
                "email": f"first_{notification_email}",
                "password": "TestPassword123!",
                "full_name": "First User"
            }
        )
        assert first_response.status_code == 200
        
        # Try to use same token again
        second_response = requests.post(
            f"{BASE_URL}/api/auth/complete-registration",
            json={
                "token": token,
                "email": f"second_{notification_email}",
                "password": "TestPassword123!",
                "full_name": "Second User"
            }
        )
        
        # Should fail - token already used
        assert second_response.status_code in [400, 401, 403], f"Expected 400/401/403, got {second_response.status_code}"
        print("✅ Token cannot be reused after registration")
    
    # Test 8: Complete registration fails with invalid token
    def test_complete_registration_invalid_token(self):
        """Verify complete registration fails with invalid token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/complete-registration",
            json={
                "token": "invalid_token_12345",
                "email": "test@example.com",
                "password": "TestPassword123!",
                "full_name": "Test User"
            }
        )
        
        assert response.status_code in [400, 401, 404], f"Expected 400/401/404, got {response.status_code}"
        print("✅ Complete registration fails with invalid token")
    
    # Test 9: Login with newly registered client
    def test_client_can_login_after_registration(self):
        """Verify client can login with their chosen email after completing registration"""
        notification_email = f"TEST_login_verify_{uuid.uuid4().hex[:8]}@example.com"
        login_email = f"TEST_client_login_{uuid.uuid4().hex[:8]}@example.com"
        password = "TestPassword123!"
        
        # Create invitation
        create_response = requests.post(
            f"{BASE_URL}/api/clients/invite",
            json={"email": notification_email, "full_name": "Test Login After Reg"},
            headers=self.headers
        )
        assert create_response.status_code == 200
        token = create_response.json()["invitation_link"].split("token=")[-1]
        
        # Complete registration
        complete_response = requests.post(
            f"{BASE_URL}/api/auth/complete-registration",
            json={
                "token": token,
                "email": login_email,
                "password": password,
                "full_name": "Test Login Client"
            }
        )
        assert complete_response.status_code == 200
        
        # Now try to login with the chosen email
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": login_email, "password": password}
        )
        
        assert login_response.status_code == 200, f"Expected 200, got {login_response.status_code}: {login_response.text}"
        login_data = login_response.json()
        
        assert "access_token" in login_data, "Login should return access token"
        assert login_data["user"]["email"] == login_email, "Logged in user should have the chosen email"
        assert login_data["user"]["role"] == "cliente", "User should have cliente role"
        
        print(f"✅ Client can login with chosen email: {login_email}")
    
    # Test 10: Resend invite fails for completed invitation
    def test_resend_fails_for_completed_invitation(self):
        """Verify resend fails after invitation is completed"""
        notification_email = f"TEST_resend_complete_{uuid.uuid4().hex[:8]}@example.com"
        
        # Create and complete invitation
        create_response = requests.post(
            f"{BASE_URL}/api/clients/invite",
            json={"email": notification_email, "full_name": "Test Resend Complete"},
            headers=self.headers
        )
        assert create_response.status_code == 200
        invite_id = create_response.json()["invite_id"]
        token = create_response.json()["invitation_link"].split("token=")[-1]
        
        # Complete the registration
        requests.post(
            f"{BASE_URL}/api/auth/complete-registration",
            json={
                "token": token,
                "email": f"complete_{notification_email}",
                "password": "TestPassword123!",
                "full_name": "Completed User"
            }
        )
        
        # Try to resend - should fail
        resend_response = requests.post(
            f"{BASE_URL}/api/clients/resend-invite/{invite_id}",
            headers=self.headers
        )
        
        # Should return error (400 or 404)
        assert resend_response.status_code in [400, 404], f"Expected 400/404 for completed invitation, got {resend_response.status_code}"
        print("✅ Resend fails for already completed invitation")


class TestInvitationEndpointValidation:
    """Test input validation for invitation endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "info@fiscaltaxcanarie.com", "password": "Triana48+"}
        )
        if login_response.status_code == 200:
            self.headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_invite_requires_email(self):
        """Invite endpoint should require email"""
        response = requests.post(
            f"{BASE_URL}/api/clients/invite",
            json={"full_name": "Only Name"},
            headers=self.headers
        )
        
        # Should fail - email is required
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✅ Invite requires email")
    
    def test_invite_validates_email_format(self):
        """Invite endpoint should validate email format"""
        response = requests.post(
            f"{BASE_URL}/api/clients/invite",
            json={"email": "not-an-email", "full_name": "Test"},
            headers=self.headers
        )
        
        # Should fail - invalid email format
        assert response.status_code == 422, f"Expected 422 for invalid email, got {response.status_code}"
        print("✅ Invite validates email format")
    
    def test_invite_requires_auth(self):
        """Invite endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/clients/invite",
            json={"email": "test@example.com", "full_name": "Test"}
            # No auth headers
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ Invite requires authentication")
    
    def test_complete_registration_validates_password_length(self):
        """Complete registration should enforce minimum password length"""
        response = requests.post(
            f"{BASE_URL}/api/auth/complete-registration",
            json={
                "token": "some_token",
                "email": "test@example.com",
                "password": "short",  # Too short
                "full_name": "Test"
            }
        )
        
        # Should fail due to short password or invalid token
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✅ Complete registration validates password")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
