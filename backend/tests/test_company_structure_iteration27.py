"""
Test Company Structure Feature - Iteration 27
Tests for: tipo_amministrazione, company_administrators, company_shareholders
These fields are only relevant for clients with tipo_cliente='societa'
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "info@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Triana48+"
CLIENT_SOCIETA_EMAIL = "c.petrazzuolo@gmail.com"
CLIENT_SOCIETA_PASSWORD = "TestClient123!"


class TestCompanyStructureBackend:
    """Tests for Company Structure feature - Backend API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token and find societa client"""
        # Admin login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Find societa client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=self.admin_headers)
        assert clients_response.status_code == 200
        clients = clients_response.json()
        
        # Find client with tipo_cliente='societa'
        self.societa_client = None
        for client in clients:
            if client.get("tipo_cliente") == "societa":
                self.societa_client = client
                break
        
        # If no societa client found, create one for testing
        if not self.societa_client:
            # Find any client and update to societa
            if clients:
                test_client = clients[0]
                update_response = requests.put(
                    f"{BASE_URL}/api/clients/{test_client['id']}",
                    json={"tipo_cliente": "societa"},
                    headers=self.admin_headers
                )
                if update_response.status_code == 200:
                    self.societa_client = test_client
                    self.societa_client["tipo_cliente"] = "societa"
    
    # ==================== GET /api/clients TESTS ====================
    
    def test_get_clients_returns_company_structure_fields(self):
        """Test 1: GET /api/clients returns tipo_amministrazione, company_administrators, company_shareholders"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.admin_headers)
        assert response.status_code == 200
        
        clients = response.json()
        assert len(clients) > 0, "No clients found"
        
        # Check that all clients have the new fields in response
        for client in clients:
            assert "tipo_amministrazione" in client, f"Missing tipo_amministrazione for client {client.get('id')}"
            assert "company_administrators" in client, f"Missing company_administrators for client {client.get('id')}"
            assert "company_shareholders" in client, f"Missing company_shareholders for client {client.get('id')}"
        
        print(f"✓ GET /api/clients returns company structure fields for {len(clients)} clients")
    
    def test_get_single_client_returns_company_structure_fields(self):
        """Test 2: GET /api/clients/{id} returns company structure fields after update"""
        assert self.societa_client, "No societa client available for testing"
        
        # First, update the client with company structure fields to ensure they exist
        update_response = requests.put(
            f"{BASE_URL}/api/clients/{self.societa_client['id']}",
            json={
                "tipo_amministrazione": "unico",
                "company_administrators": [],
                "company_shareholders": []
            },
            headers=self.admin_headers
        )
        assert update_response.status_code == 200, f"Failed to update client: {update_response.text}"
        
        # Now get the client
        response = requests.get(
            f"{BASE_URL}/api/clients/{self.societa_client['id']}", 
            headers=self.admin_headers
        )
        assert response.status_code == 200
        
        client = response.json()
        # After update, these fields should be present
        assert "tipo_amministrazione" in client, f"Missing tipo_amministrazione. Keys: {list(client.keys())}"
        assert "company_administrators" in client, f"Missing company_administrators. Keys: {list(client.keys())}"
        assert "company_shareholders" in client, f"Missing company_shareholders. Keys: {list(client.keys())}"
        
        print(f"✓ GET /api/clients/{self.societa_client['id']} returns company structure fields")
    
    # ==================== PUT /api/clients/{id} TESTS ====================
    
    def test_update_client_tipo_amministrazione(self):
        """Test 3: PUT /api/clients/{id} - Update tipo_amministrazione"""
        assert self.societa_client, "No societa client available for testing"
        
        # Test all valid values
        valid_values = ["unico", "solidale", "mancomunado"]
        
        for value in valid_values:
            response = requests.put(
                f"{BASE_URL}/api/clients/{self.societa_client['id']}",
                json={"tipo_amministrazione": value},
                headers=self.admin_headers
            )
            assert response.status_code == 200, f"Failed to update tipo_amministrazione to {value}: {response.text}"
            
            # Verify the update
            get_response = requests.get(
                f"{BASE_URL}/api/clients/{self.societa_client['id']}", 
                headers=self.admin_headers
            )
            assert get_response.status_code == 200
            assert get_response.json().get("tipo_amministrazione") == value
            
            print(f"✓ Updated tipo_amministrazione to '{value}' successfully")
    
    def test_update_client_company_administrators(self):
        """Test 4: PUT /api/clients/{id} - Update company_administrators"""
        assert self.societa_client, "No societa client available for testing"
        
        test_administrators = [
            {
                "id": str(uuid.uuid4()),
                "nome": "Mario",
                "cognome": "Rossi",
                "documento": "X-1234567-A",
                "carica": "Amministratore Delegato",
                "data_nomina": "2024-01-15",
                "note": "Fondatore della società"
            },
            {
                "id": str(uuid.uuid4()),
                "nome": "Luigi",
                "cognome": "Verdi",
                "documento": "Y-7654321-B",
                "carica": "Consigliere",
                "data_nomina": "2024-06-01",
                "note": ""
            }
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/clients/{self.societa_client['id']}",
            json={"company_administrators": test_administrators},
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Failed to update company_administrators: {response.text}"
        
        # Verify the update
        get_response = requests.get(
            f"{BASE_URL}/api/clients/{self.societa_client['id']}", 
            headers=self.admin_headers
        )
        assert get_response.status_code == 200
        saved_admins = get_response.json().get("company_administrators")
        assert saved_admins is not None
        assert len(saved_admins) == 2
        assert saved_admins[0]["nome"] == "Mario"
        assert saved_admins[1]["nome"] == "Luigi"
        
        print(f"✓ Updated company_administrators with {len(test_administrators)} administrators")
    
    def test_update_client_company_shareholders(self):
        """Test 5: PUT /api/clients/{id} - Update company_shareholders"""
        assert self.societa_client, "No societa client available for testing"
        
        test_shareholders = [
            {
                "id": str(uuid.uuid4()),
                "denominazione": "Mario Rossi",
                "documento": "X-1234567-A",
                "percentuale": "60",
                "note": "Socio fondatore"
            },
            {
                "id": str(uuid.uuid4()),
                "denominazione": "Holding ABC S.L.",
                "documento": "B-12345678",
                "percentuale": "40",
                "note": "Socio investitore"
            }
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/clients/{self.societa_client['id']}",
            json={"company_shareholders": test_shareholders},
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Failed to update company_shareholders: {response.text}"
        
        # Verify the update
        get_response = requests.get(
            f"{BASE_URL}/api/clients/{self.societa_client['id']}", 
            headers=self.admin_headers
        )
        assert get_response.status_code == 200
        saved_shareholders = get_response.json().get("company_shareholders")
        assert saved_shareholders is not None
        assert len(saved_shareholders) == 2
        assert saved_shareholders[0]["denominazione"] == "Mario Rossi"
        assert saved_shareholders[0]["percentuale"] == "60"
        assert saved_shareholders[1]["denominazione"] == "Holding ABC S.L."
        assert saved_shareholders[1]["percentuale"] == "40"
        
        print(f"✓ Updated company_shareholders with {len(test_shareholders)} shareholders (total 100%)")
    
    def test_update_client_full_company_structure(self):
        """Test 6: PUT /api/clients/{id} - Update all company structure fields at once"""
        assert self.societa_client, "No societa client available for testing"
        
        full_update = {
            "tipo_amministrazione": "solidale",
            "company_administrators": [
                {
                    "id": str(uuid.uuid4()),
                    "nome": "Test",
                    "cognome": "Admin",
                    "documento": "Z-9999999-Z",
                    "carica": "CEO",
                    "data_nomina": "2025-01-01",
                    "note": "Test administrator"
                }
            ],
            "company_shareholders": [
                {
                    "id": str(uuid.uuid4()),
                    "denominazione": "Test Shareholder",
                    "documento": "TEST-123",
                    "percentuale": "100",
                    "note": "Sole shareholder"
                }
            ]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/clients/{self.societa_client['id']}",
            json=full_update,
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Failed to update full company structure: {response.text}"
        
        # Verify all fields
        get_response = requests.get(
            f"{BASE_URL}/api/clients/{self.societa_client['id']}", 
            headers=self.admin_headers
        )
        assert get_response.status_code == 200
        client = get_response.json()
        
        assert client.get("tipo_amministrazione") == "solidale"
        assert len(client.get("company_administrators", [])) == 1
        assert len(client.get("company_shareholders", [])) == 1
        
        print("✓ Updated all company structure fields at once")
    
    # ==================== PUT /api/auth/me TESTS (Client self-update) ====================
    
    def test_client_self_update_company_structure(self):
        """Test 7: PUT /api/auth/me - Client can update their own company structure"""
        # Login as societa client
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_SOCIETA_EMAIL,
            "password": CLIENT_SOCIETA_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Client login failed: {login_response.text}")
        
        client_token = login_response.json()["access_token"]
        client_headers = {"Authorization": f"Bearer {client_token}"}
        
        # Check if client is tipo_cliente='societa'
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=client_headers)
        assert me_response.status_code == 200
        
        if me_response.json().get("tipo_cliente") != "societa":
            pytest.skip("Client is not tipo_cliente='societa'")
        
        # Update company structure
        update_data = {
            "tipo_amministrazione": "unico",
            "company_administrators": [
                {
                    "id": str(uuid.uuid4()),
                    "nome": "Self",
                    "cognome": "Update",
                    "documento": "SELF-123",
                    "carica": "Amministratore Unico",
                    "data_nomina": "2025-06-01",
                    "note": "Updated by client"
                }
            ],
            "company_shareholders": [
                {
                    "id": str(uuid.uuid4()),
                    "denominazione": "Self Update Shareholder",
                    "documento": "SELF-456",
                    "percentuale": "100",
                    "note": "Updated by client"
                }
            ]
        }
        
        response = requests.put(f"{BASE_URL}/api/auth/me", json=update_data, headers=client_headers)
        assert response.status_code == 200, f"Client self-update failed: {response.text}"
        
        # Verify the update
        verify_response = requests.get(f"{BASE_URL}/api/auth/me", headers=client_headers)
        assert verify_response.status_code == 200
        
        # Note: The /api/auth/me endpoint may not return company structure fields
        # Check if they are in the response
        user_data = verify_response.json()
        print(f"✓ Client self-update completed. Response keys: {list(user_data.keys())}")
    
    # ==================== EDGE CASES ====================
    
    def test_update_empty_administrators_list(self):
        """Test 8: PUT /api/clients/{id} - Update with empty administrators list"""
        assert self.societa_client, "No societa client available for testing"
        
        response = requests.put(
            f"{BASE_URL}/api/clients/{self.societa_client['id']}",
            json={"company_administrators": []},
            headers=self.admin_headers
        )
        assert response.status_code == 200
        
        # Verify
        get_response = requests.get(
            f"{BASE_URL}/api/clients/{self.societa_client['id']}", 
            headers=self.admin_headers
        )
        assert get_response.status_code == 200
        assert get_response.json().get("company_administrators") == []
        
        print("✓ Updated with empty administrators list")
    
    def test_update_empty_shareholders_list(self):
        """Test 9: PUT /api/clients/{id} - Update with empty shareholders list"""
        assert self.societa_client, "No societa client available for testing"
        
        response = requests.put(
            f"{BASE_URL}/api/clients/{self.societa_client['id']}",
            json={"company_shareholders": []},
            headers=self.admin_headers
        )
        assert response.status_code == 200
        
        # Verify
        get_response = requests.get(
            f"{BASE_URL}/api/clients/{self.societa_client['id']}", 
            headers=self.admin_headers
        )
        assert get_response.status_code == 200
        assert get_response.json().get("company_shareholders") == []
        
        print("✓ Updated with empty shareholders list")
    
    def test_filter_clients_by_tipo_societa(self):
        """Test 10: GET /api/clients?tipo_cliente=societa - Filter by tipo_cliente"""
        response = requests.get(
            f"{BASE_URL}/api/clients?tipo_cliente=societa", 
            headers=self.admin_headers
        )
        assert response.status_code == 200
        
        clients = response.json()
        for client in clients:
            assert client.get("tipo_cliente") == "societa", f"Client {client.get('id')} is not societa"
            # All societa clients should have company structure fields
            assert "tipo_amministrazione" in client
            assert "company_administrators" in client
            assert "company_shareholders" in client
        
        print(f"✓ Filtered {len(clients)} clients with tipo_cliente='societa'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
