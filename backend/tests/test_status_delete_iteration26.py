"""
Test file for Iteration 26: Declaration Status Management and Soft Delete
Tests:
1. PUT /api/declarations/tax-returns/{id}/status - Update declaration status with all valid states
2. DELETE /api/declarations/tax-returns/{id}?soft_delete=true - Soft delete declaration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "info@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Triana48+"
CLIENT_EMAIL = "francesco@fiscaltaxcanarie.com"
CLIENT_PASSWORD = "TestClient123!"


def make_status_update_request(token, declaration_id, nuovo_stato, motivo=None):
    """Helper function to make status update request with proper multipart form data"""
    headers = {"Authorization": f"Bearer {token}"}
    data = {"nuovo_stato": nuovo_stato}
    if motivo:
        data["motivo"] = motivo
    
    return requests.put(
        f"{BASE_URL}/api/declarations/tax-returns/{declaration_id}/status",
        headers=headers,
        data=data
    )


class TestStatusAndDeleteFeatures:
    """Tests for declaration status update and soft delete functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token and find a test declaration"""
        # Login as admin
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        self.admin_token = login_res.json()["access_token"]
        self.admin_user = login_res.json()["user"]
        
        # Get list of declarations
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        declarations_res = requests.get(f"{BASE_URL}/api/declarations/tax-returns", headers=headers)
        assert declarations_res.status_code == 200, f"Failed to get declarations: {declarations_res.text}"
        
        declarations = declarations_res.json()
        assert len(declarations) > 0, "No declarations found for testing"
        
        # Use the first declaration for testing
        self.test_declaration_id = declarations[0]["id"]
        self.original_stato = declarations[0]["stato"]
        print(f"Using declaration ID: {self.test_declaration_id}, current stato: {self.original_stato}")
        
        yield
        
        # Teardown: Restore original state if changed
        if hasattr(self, 'test_declaration_id') and hasattr(self, 'original_stato'):
            try:
                make_status_update_request(self.admin_token, self.test_declaration_id, self.original_stato)
            except:
                pass

    # ==================== STATUS UPDATE TESTS ====================
    
    def test_update_status_to_bozza(self):
        """Test updating status to 'bozza' (yellow - pending)"""
        res = make_status_update_request(self.admin_token, self.test_declaration_id, "bozza")
        
        assert res.status_code == 200, f"Failed to update status to bozza: {res.text}"
        data = res.json()
        assert data["nuovo_stato"] == "bozza"
        print("✓ Status updated to 'bozza' successfully")
    
    def test_update_status_to_inviata(self):
        """Test updating status to 'inviata' (yellow - pending)"""
        res = make_status_update_request(self.admin_token, self.test_declaration_id, "inviata")
        
        assert res.status_code == 200, f"Failed to update status to inviata: {res.text}"
        data = res.json()
        assert data["nuovo_stato"] == "inviata"
        print("✓ Status updated to 'inviata' successfully")
    
    def test_update_status_to_documentazione_incompleta(self):
        """Test updating status to 'documentazione_incompleta' (yellow - pending)"""
        res = make_status_update_request(self.admin_token, self.test_declaration_id, "documentazione_incompleta")
        
        assert res.status_code == 200, f"Failed to update status: {res.text}"
        data = res.json()
        assert data["nuovo_stato"] == "documentazione_incompleta"
        print("✓ Status updated to 'documentazione_incompleta' successfully")
    
    def test_update_status_to_in_revisione(self):
        """Test updating status to 'in_revisione' (yellow - pending)"""
        res = make_status_update_request(self.admin_token, self.test_declaration_id, "in_revisione")
        
        assert res.status_code == 200, f"Failed to update status: {res.text}"
        data = res.json()
        assert data["nuovo_stato"] == "in_revisione"
        print("✓ Status updated to 'in_revisione' successfully")
    
    def test_update_status_to_pronta(self):
        """Test updating status to 'pronta' (yellow - pending)"""
        res = make_status_update_request(self.admin_token, self.test_declaration_id, "pronta")
        
        assert res.status_code == 200, f"Failed to update status: {res.text}"
        data = res.json()
        assert data["nuovo_stato"] == "pronta"
        print("✓ Status updated to 'pronta' successfully")
    
    def test_update_status_to_presentata(self):
        """Test updating status to 'presentata' (GREEN - completed)"""
        res = make_status_update_request(self.admin_token, self.test_declaration_id, "presentata")
        
        assert res.status_code == 200, f"Failed to update status: {res.text}"
        data = res.json()
        assert data["nuovo_stato"] == "presentata"
        print("✓ Status updated to 'presentata' (GREEN) successfully")
    
    def test_update_status_to_errata(self):
        """Test updating status to 'errata' (RED - error)"""
        res = make_status_update_request(self.admin_token, self.test_declaration_id, "errata")
        
        assert res.status_code == 200, f"Failed to update status: {res.text}"
        data = res.json()
        assert data["nuovo_stato"] == "errata"
        print("✓ Status updated to 'errata' (RED) successfully")
    
    def test_update_status_to_non_presentare(self):
        """Test updating status to 'non_presentare' (RED - do not submit)"""
        res = make_status_update_request(self.admin_token, self.test_declaration_id, "non_presentare")
        
        assert res.status_code == 200, f"Failed to update status: {res.text}"
        data = res.json()
        assert data["nuovo_stato"] == "non_presentare"
        print("✓ Status updated to 'non_presentare' (RED) successfully")
    
    def test_update_status_to_archiviata(self):
        """Test updating status to 'archiviata' (GREY - archived)"""
        res = make_status_update_request(self.admin_token, self.test_declaration_id, "archiviata")
        
        assert res.status_code == 200, f"Failed to update status: {res.text}"
        data = res.json()
        assert data["nuovo_stato"] == "archiviata"
        print("✓ Status updated to 'archiviata' (GREY) successfully")
    
    def test_update_status_with_motivo(self):
        """Test updating status with optional 'motivo' (reason)"""
        res = make_status_update_request(
            self.admin_token, 
            self.test_declaration_id, 
            "in_revisione",
            motivo="Verifica documenti in corso"
        )
        
        assert res.status_code == 200, f"Failed to update status with motivo: {res.text}"
        data = res.json()
        assert data["nuovo_stato"] == "in_revisione"
        print("✓ Status updated with 'motivo' successfully")
    
    def test_update_status_invalid_state(self):
        """Test updating status with invalid state returns 400"""
        res = make_status_update_request(self.admin_token, self.test_declaration_id, "stato_invalido")
        
        assert res.status_code == 400, f"Expected 400 for invalid state, got {res.status_code}"
        print("✓ Invalid state correctly rejected with 400")
    
    def test_update_status_nonexistent_declaration(self):
        """Test updating status of non-existent declaration returns 404"""
        res = make_status_update_request(self.admin_token, "nonexistent-id-12345", "bozza")
        
        assert res.status_code == 404, f"Expected 404 for non-existent declaration, got {res.status_code}"
        print("✓ Non-existent declaration correctly returns 404")
    
    def test_verify_status_persisted(self):
        """Test that status change is persisted in database"""
        # Update to a specific state
        res = make_status_update_request(self.admin_token, self.test_declaration_id, "pronta")
        assert res.status_code == 200
        
        # Verify by fetching the declaration
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        get_res = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_declaration_id}",
            headers=headers
        )
        assert get_res.status_code == 200
        declaration = get_res.json()
        assert declaration["stato"] == "pronta", f"Expected stato='pronta', got '{declaration['stato']}'"
        print("✓ Status change persisted correctly in database")


class TestSoftDeleteFeature:
    """Tests for soft delete functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token"""
        # Login as admin
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        self.admin_token = login_res.json()["access_token"]
        
        # Get list of declarations
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        declarations_res = requests.get(f"{BASE_URL}/api/declarations/tax-returns", headers=headers)
        assert declarations_res.status_code == 200
        
        declarations = declarations_res.json()
        assert len(declarations) > 0, "No declarations found for testing"
        
        # Use the first declaration for testing
        self.test_declaration_id = declarations[0]["id"]
        self.original_stato = declarations[0]["stato"]
        
        yield
        
        # Teardown: Restore original state if soft deleted
        if hasattr(self, 'test_declaration_id') and hasattr(self, 'original_stato'):
            try:
                make_status_update_request(self.admin_token, self.test_declaration_id, self.original_stato)
            except:
                pass
    
    def test_soft_delete_declaration(self):
        """Test soft delete sets stato to 'eliminata'"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        res = requests.delete(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_declaration_id}?soft_delete=true",
            headers=headers
        )
        
        assert res.status_code == 200, f"Soft delete failed: {res.text}"
        data = res.json()
        assert data.get("recoverable") == True, "Expected recoverable=True for soft delete"
        print("✓ Soft delete successful, recoverable=True")
        
        # Verify stato is 'eliminata'
        get_res = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_declaration_id}",
            headers=headers
        )
        assert get_res.status_code == 200
        declaration = get_res.json()
        assert declaration["stato"] == "eliminata", f"Expected stato='eliminata', got '{declaration['stato']}'"
        print("✓ Declaration stato is 'eliminata' after soft delete")
    
    def test_soft_delete_nonexistent_declaration(self):
        """Test soft delete of non-existent declaration returns 404"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        res = requests.delete(
            f"{BASE_URL}/api/declarations/tax-returns/nonexistent-id-12345?soft_delete=true",
            headers=headers
        )
        
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"
        print("✓ Non-existent declaration correctly returns 404")


class TestClientPermissions:
    """Tests for client permission restrictions on status update"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get client token"""
        # Login as client
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        
        if login_res.status_code != 200:
            pytest.skip(f"Client login failed: {login_res.text}")
        
        self.client_token = login_res.json()["access_token"]
        
        # Get client's declarations
        headers = {"Authorization": f"Bearer {self.client_token}"}
        declarations_res = requests.get(f"{BASE_URL}/api/declarations/tax-returns", headers=headers)
        
        if declarations_res.status_code != 200 or len(declarations_res.json()) == 0:
            pytest.skip("No client declarations found")
        
        self.test_declaration_id = declarations_res.json()[0]["id"]
        self.original_stato = declarations_res.json()[0]["stato"]
    
    def test_client_cannot_change_status_arbitrarily(self):
        """Test that client cannot change status to arbitrary values"""
        res = make_status_update_request(self.client_token, self.test_declaration_id, "presentata")
        
        # Client should get 403 for trying to change to non-allowed state
        assert res.status_code == 403, f"Expected 403 for client status change, got {res.status_code}"
        print("✓ Client correctly restricted from arbitrary status changes")
    
    def test_client_cannot_delete_non_bozza(self):
        """Test that client cannot delete declaration not in 'bozza' state"""
        headers = {"Authorization": f"Bearer {self.client_token}"}
        
        # If declaration is not in bozza, client should not be able to delete
        if self.original_stato != "bozza":
            res = requests.delete(
                f"{BASE_URL}/api/declarations/tax-returns/{self.test_declaration_id}",
                headers=headers
            )
            
            assert res.status_code == 400, f"Expected 400 for client delete non-bozza, got {res.status_code}"
            print("✓ Client correctly restricted from deleting non-bozza declaration")
        else:
            pytest.skip("Declaration is in bozza state, skipping this test")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
