"""
Test Document Preview Feature (Iteration 17)
Tests the inline document preview functionality for PDF, images, and text files.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "info@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Triana48+"

# Known test document ID
TEST_DOCUMENT_ID = "fd335269-bd55-421a-b7dd-461d25923e31"


class TestDocumentPreviewAPI:
    """Tests for GET /api/documents/{doc_id}/preview endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json().get("access_token")
        assert token, "No access token received"
        return token
    
    def test_preview_endpoint_exists(self, admin_token):
        """Test that the preview endpoint exists and accepts token as query param"""
        response = requests.get(
            f"{BASE_URL}/api/documents/{TEST_DOCUMENT_ID}/preview",
            params={"token": admin_token}
        )
        # Should return 200 for valid document with valid token
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ Preview endpoint returns 200 for valid document")
    
    def test_preview_returns_inline_content_disposition(self, admin_token):
        """Test that preview returns Content-Disposition: inline for viewing"""
        response = requests.get(
            f"{BASE_URL}/api/documents/{TEST_DOCUMENT_ID}/preview",
            params={"token": admin_token}
        )
        assert response.status_code == 200
        
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "inline" in content_disposition, f"Expected 'inline' in Content-Disposition, got: {content_disposition}"
        print(f"✅ Content-Disposition is 'inline': {content_disposition}")
    
    def test_preview_returns_correct_content_type_pdf(self, admin_token):
        """Test that PDF documents return application/pdf content type"""
        response = requests.get(
            f"{BASE_URL}/api/documents/{TEST_DOCUMENT_ID}/preview",
            params={"token": admin_token}
        )
        assert response.status_code == 200
        
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected 'application/pdf', got: {content_type}"
        print(f"✅ Content-Type for PDF: {content_type}")
    
    def test_preview_returns_binary_content(self, admin_token):
        """Test that preview returns actual file content"""
        response = requests.get(
            f"{BASE_URL}/api/documents/{TEST_DOCUMENT_ID}/preview",
            params={"token": admin_token}
        )
        assert response.status_code == 200
        
        # Should have content
        assert len(response.content) > 0, "No content returned"
        
        # For PDF, check magic bytes
        if "application/pdf" in response.headers.get("Content-Type", ""):
            assert response.content[:4] == b'%PDF', "PDF content should start with %PDF magic bytes"
            print(f"✅ PDF content verified (size: {len(response.content)} bytes)")
        else:
            print(f"✅ Content returned (size: {len(response.content)} bytes)")
    
    def test_preview_requires_token(self):
        """Test that preview endpoint requires token"""
        response = requests.get(
            f"{BASE_URL}/api/documents/{TEST_DOCUMENT_ID}/preview"
        )
        # Should return 401 or 422 without token
        assert response.status_code in [401, 422], f"Expected 401/422 without token, got {response.status_code}"
        print(f"✅ Preview requires token (returns {response.status_code} without token)")
    
    def test_preview_invalid_token(self):
        """Test that preview rejects invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/documents/{TEST_DOCUMENT_ID}/preview",
            params={"token": "invalid_token_123"}
        )
        # Should return 401 with invalid token
        assert response.status_code == 401, f"Expected 401 with invalid token, got {response.status_code}"
        print(f"✅ Preview rejects invalid token (returns 401)")
    
    def test_preview_expired_token(self):
        """Test that preview rejects expired token"""
        # This is an expired token format - should be rejected
        expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWlkIiwiZXhwIjoxfQ.test"
        response = requests.get(
            f"{BASE_URL}/api/documents/{TEST_DOCUMENT_ID}/preview",
            params={"token": expired_token}
        )
        # Should return 401 with expired/invalid token
        assert response.status_code == 401, f"Expected 401 with expired token, got {response.status_code}"
        print(f"✅ Preview rejects expired/invalid token (returns 401)")
    
    def test_preview_nonexistent_document(self, admin_token):
        """Test that preview returns 404 for non-existent document"""
        fake_doc_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(
            f"{BASE_URL}/api/documents/{fake_doc_id}/preview",
            params={"token": admin_token}
        )
        # Should return 404 for non-existent document
        assert response.status_code == 404, f"Expected 404 for non-existent document, got {response.status_code}"
        print(f"✅ Preview returns 404 for non-existent document")
    
    def test_preview_caching_headers(self, admin_token):
        """Test that preview returns appropriate caching headers"""
        response = requests.get(
            f"{BASE_URL}/api/documents/{TEST_DOCUMENT_ID}/preview",
            params={"token": admin_token}
        )
        assert response.status_code == 200
        
        # Should have Cache-Control header
        cache_control = response.headers.get("Cache-Control", "")
        assert cache_control, "Cache-Control header should be present"
        print(f"✅ Cache-Control header: {cache_control}")


class TestClientDocumentPreviewAccess:
    """Tests for client access to document preview"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("access_token")
    
    def test_admin_can_preview_any_document(self, admin_token):
        """Test that admin can preview any document"""
        response = requests.get(
            f"{BASE_URL}/api/documents/{TEST_DOCUMENT_ID}/preview",
            params={"token": admin_token}
        )
        assert response.status_code == 200, f"Admin should be able to preview documents, got {response.status_code}"
        print(f"✅ Admin can preview documents")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
