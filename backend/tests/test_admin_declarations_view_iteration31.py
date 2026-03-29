"""
Test Admin Declarations View - Iteration 31
Tests for:
- GET /api/declarations/tax-returns returns client_name and client_email
- PUT /api/declarations/tax-returns/{id}/status changes status correctly
- DELETE /api/declarations/tax-returns/{id}?soft_delete=true deletes pratica
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials from review request
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"


class TestAdminDeclarationsView:
    """Tests for Admin Declarations View feature"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get headers with admin auth"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    # ==================== GET /api/declarations/tax-returns ====================
    
    def test_get_tax_returns_returns_client_info(self, admin_headers):
        """Test that GET /api/declarations/tax-returns returns client_name and client_email"""
        response = requests.get(f"{BASE_URL}/api/declarations/tax-returns", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get tax returns: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are tax returns, verify they have client_name and client_email
        if len(data) > 0:
            first_return = data[0]
            assert "client_name" in first_return, "Tax return should have client_name field"
            assert "client_email" in first_return, "Tax return should have client_email field"
            print(f"SUCCESS: Tax return has client_name='{first_return.get('client_name')}' and client_email='{first_return.get('client_email')}'")
        else:
            print("INFO: No tax returns found, but endpoint works correctly")
    
    def test_get_tax_returns_list_structure(self, admin_headers):
        """Test that tax returns list has correct structure"""
        response = requests.get(f"{BASE_URL}/api/declarations/tax-returns", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            first_return = data[0]
            # Check required fields
            required_fields = ["id", "client_id", "anno_fiscale", "stato", "updated_at"]
            for field in required_fields:
                assert field in first_return, f"Missing required field: {field}"
            print(f"SUCCESS: Tax return has all required fields: {required_fields}")
    
    # ==================== PUT /api/declarations/tax-returns/{id}/status ====================
    
    def test_update_tax_return_status(self, admin_headers):
        """Test that PUT /api/declarations/tax-returns/{id}/status changes status correctly"""
        # First get a tax return to update
        response = requests.get(f"{BASE_URL}/api/declarations/tax-returns", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data) == 0:
            pytest.skip("No tax returns available to test status update")
        
        # Find a tax return that is not 'eliminata'
        test_return = None
        for tr in data:
            if tr.get("stato") != "eliminata":
                test_return = tr
                break
        
        if not test_return:
            pytest.skip("No non-deleted tax returns available")
        
        tax_return_id = test_return["id"]
        original_status = test_return["stato"]
        
        # Choose a new status different from current
        status_options = ["bozza", "inviata", "in_revisione", "pronta", "presentata", "errata", "non_presentare"]
        new_status = None
        for status in status_options:
            if status != original_status:
                new_status = status
                break
        
        # Update status using FormData
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/status",
            headers=admin_headers,
            data={"nuovo_stato": new_status}
        )
        assert response.status_code == 200, f"Failed to update status: {response.text}"
        
        result = response.json()
        assert result.get("nuovo_stato") == new_status, f"Status not updated correctly: {result}"
        print(f"SUCCESS: Status changed from '{original_status}' to '{new_status}'")
        
        # Verify the change by getting the tax return again
        response = requests.get(f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}", headers=admin_headers)
        assert response.status_code == 200
        updated_return = response.json()
        assert updated_return.get("stato") == new_status, f"Status not persisted: {updated_return.get('stato')}"
        print(f"SUCCESS: Status change persisted correctly")
        
        # Restore original status
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/status",
            headers=admin_headers,
            data={"nuovo_stato": original_status}
        )
        assert response.status_code == 200, f"Failed to restore status: {response.text}"
        print(f"SUCCESS: Status restored to '{original_status}'")
    
    def test_update_status_invalid_status(self, admin_headers):
        """Test that invalid status returns error"""
        # Get a tax return
        response = requests.get(f"{BASE_URL}/api/declarations/tax-returns", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data) == 0:
            pytest.skip("No tax returns available")
        
        tax_return_id = data[0]["id"]
        
        # Try to set invalid status
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/status",
            headers=admin_headers,
            data={"nuovo_stato": "invalid_status_xyz"}
        )
        assert response.status_code == 400, f"Should reject invalid status: {response.text}"
        print("SUCCESS: Invalid status correctly rejected")
    
    # ==================== DELETE /api/declarations/tax-returns/{id}?soft_delete=true ====================
    
    def test_soft_delete_tax_return(self, admin_headers):
        """Test that DELETE with soft_delete=true marks pratica as 'eliminata'"""
        # Get tax returns
        response = requests.get(f"{BASE_URL}/api/declarations/tax-returns", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data) == 0:
            pytest.skip("No tax returns available to test delete")
        
        # Find a tax return that is not already 'eliminata'
        test_return = None
        for tr in data:
            if tr.get("stato") != "eliminata":
                test_return = tr
                break
        
        if not test_return:
            pytest.skip("No non-deleted tax returns available")
        
        tax_return_id = test_return["id"]
        original_status = test_return["stato"]
        
        # Soft delete
        response = requests.delete(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}?soft_delete=true",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to soft delete: {response.text}"
        
        result = response.json()
        # Admin soft delete returns 'recoverable: True' or just 'message'
        assert "message" in result, f"Should have message: {result}"
        print(f"SUCCESS: Tax return soft deleted - {result}")
        
        # Verify the tax return is now 'eliminata'
        response = requests.get(f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}", headers=admin_headers)
        assert response.status_code == 200
        deleted_return = response.json()
        assert deleted_return.get("stato") == "eliminata", f"Status should be 'eliminata': {deleted_return.get('stato')}"
        print(f"SUCCESS: Tax return status is now 'eliminata'")
        
        # Restore the original status
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/status",
            headers=admin_headers,
            data={"nuovo_stato": original_status}
        )
        assert response.status_code == 200, f"Failed to restore status: {response.text}"
        print(f"SUCCESS: Tax return restored to '{original_status}'")
    
    def test_delete_nonexistent_tax_return(self, admin_headers):
        """Test that deleting non-existent tax return returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/declarations/tax-returns/nonexistent-id-12345?soft_delete=true",
            headers=admin_headers
        )
        assert response.status_code == 404, f"Should return 404: {response.text}"
        print("SUCCESS: Non-existent tax return correctly returns 404")
    
    # ==================== GET /api/declarations/clients-with-declarations ====================
    
    def test_get_clients_with_declarations(self, admin_headers):
        """Test that clients-with-declarations endpoint works"""
        response = requests.get(f"{BASE_URL}/api/declarations/clients-with-declarations", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get clients: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            first_client = data[0]
            assert "client_id" in first_client, "Should have client_id"
            assert "client_name" in first_client, "Should have client_name"
            assert "client_email" in first_client, "Should have client_email"
            assert "total_declarations" in first_client, "Should have total_declarations"
            print(f"SUCCESS: Found {len(data)} clients with declarations")
        else:
            print("INFO: No clients with declarations found")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
