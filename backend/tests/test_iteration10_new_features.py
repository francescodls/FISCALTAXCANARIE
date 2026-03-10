"""
Iteration 10 - Test New Features:
1. Bank Entities (GET /api/bank-entities - predefined banks, POST /api/bank-entities)
2. Client Bank Credentials (POST /api/clients/{id}/bank-credentials)
3. Client Additional Emails (POST /api/clients/{id}/emails)
4. Consulente del Lavoro (POST /api/consulenti, POST /api/consulenti/{id}/assign-clients)
5. Consulente Dashboard Endpoints (GET /api/consulente/clients, GET /api/consulente/stats)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
COMMERCIALISTA_EMAIL = "info@fiscaltaxcanarie.com"
COMMERCIALISTA_PASSWORD = "Triana48+"


class TestBankEntities:
    """Test /api/bank-entities endpoints - Bank entities management"""
    
    @pytest.fixture
    def auth_token(self):
        """Get commercialista auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COMMERCIALISTA_EMAIL,
            "password": COMMERCIALISTA_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_get_bank_entities_returns_predefined(self, auth_token):
        """GET /api/bank-entities - should return the 5 predefined banks"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/bank-entities", headers=headers)
        
        assert response.status_code == 200
        entities = response.json()
        
        # Check that we have at least 5 predefined banks
        predefined_banks = ["Revolut", "Caixa", "Santander", "BBVA", "Cajamar"]
        entity_names = [e["name"] for e in entities]
        
        for bank in predefined_banks:
            assert bank in entity_names, f"Predefined bank '{bank}' not found in entities"
        
        print(f"✅ GET /api/bank-entities returns {len(entities)} entities including all 5 predefined banks")
    
    def test_create_custom_bank_entity(self, auth_token):
        """POST /api/bank-entities - should create a custom bank"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        test_bank_name = f"TEST_Bank_{uuid.uuid4().hex[:6]}"
        
        response = requests.post(f"{BASE_URL}/api/bank-entities", 
            json={"name": test_bank_name},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "id" in data
        assert data["name"] == test_bank_name
        
        # Verify it appears in list
        list_response = requests.get(f"{BASE_URL}/api/bank-entities", headers=headers)
        entities = list_response.json()
        entity_names = [e["name"] for e in entities]
        assert test_bank_name in entity_names
        
        # Cleanup - delete the test bank
        entity_id = data["id"]
        delete_response = requests.delete(f"{BASE_URL}/api/bank-entities/{entity_id}", headers=headers)
        assert delete_response.status_code == 200
        
        print(f"✅ POST /api/bank-entities creates custom bank '{test_bank_name}' successfully")
    
    def test_create_duplicate_bank_entity_fails(self, auth_token):
        """POST /api/bank-entities - should fail for duplicate bank name"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Try to create a bank with same name as predefined
        response = requests.post(f"{BASE_URL}/api/bank-entities", 
            json={"name": "Revolut"},
            headers=headers
        )
        
        assert response.status_code == 400
        assert "già esistente" in response.json()["detail"].lower() or "already" in response.json()["detail"].lower()
        
        print("✅ POST /api/bank-entities correctly rejects duplicate bank name")
    
    def test_cannot_delete_predefined_bank(self, auth_token):
        """DELETE /api/bank-entities - should fail for predefined banks"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get Revolut ID
        response = requests.get(f"{BASE_URL}/api/bank-entities", headers=headers)
        entities = response.json()
        revolut = next((e for e in entities if e["name"] == "Revolut"), None)
        
        assert revolut is not None, "Revolut entity not found"
        
        # Try to delete it
        delete_response = requests.delete(f"{BASE_URL}/api/bank-entities/{revolut['id']}", headers=headers)
        assert delete_response.status_code == 400
        
        print("✅ DELETE /api/bank-entities correctly prevents deleting predefined banks")


class TestClientBankCredentials:
    """Test /api/clients/{id}/bank-credentials endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get commercialista auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COMMERCIALISTA_EMAIL,
            "password": COMMERCIALISTA_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture
    def test_client(self, auth_token):
        """Create a test client for bank credential tests"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        test_email = f"TEST_bank_client_{uuid.uuid4().hex[:6]}@test.com"
        
        # Invite and complete registration via direct db insert or API
        response = requests.post(f"{BASE_URL}/api/clients/invite", 
            json={"email": test_email, "full_name": "Test Bank Client"},
            headers=headers
        )
        
        if response.status_code == 200:
            # Complete registration
            invite_data = response.json()
            token = invite_data["invitation_link"].split("token=")[-1]
            
            complete_response = requests.post(f"{BASE_URL}/api/auth/complete-registration", json={
                "token": token,
                "email": test_email,
                "password": "TestPassword123!",
                "full_name": "Test Bank Client"
            })
            
            if complete_response.status_code == 200:
                # Get the client id from login
                login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                    "email": test_email,
                    "password": "TestPassword123!"
                })
                client_id = login_response.json()["user"]["id"]
                return {"id": client_id, "email": test_email, "headers": headers}
        
        # Fallback: Get any existing client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        clients = clients_response.json()
        if clients:
            return {"id": clients[0]["id"], "email": clients[0]["email"], "headers": headers}
        
        pytest.skip("No test client available")
    
    def test_add_bank_credential_to_client(self, auth_token, test_client):
        """POST /api/clients/{id}/bank-credentials - add credential to client"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        client_id = test_client["id"]
        
        # Get a bank entity ID first
        banks_response = requests.get(f"{BASE_URL}/api/bank-entities", headers=headers)
        banks = banks_response.json()
        bank_id = next((b["id"] for b in banks if b["name"] == "Revolut"), banks[0]["id"])
        
        # Add credential
        response = requests.post(f"{BASE_URL}/api/clients/{client_id}/bank-credentials", 
            json={
                "bank_entity_id": bank_id,
                "username": f"TEST_user_{uuid.uuid4().hex[:6]}",
                "password": "test_password_123"
            },
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "id" in data
        
        print(f"✅ POST /api/clients/{client_id}/bank-credentials creates credential successfully")
        
        # Cleanup - delete the credential
        cred_id = data["id"]
        requests.delete(f"{BASE_URL}/api/clients/{client_id}/bank-credentials/{cred_id}", headers=headers)
    
    def test_get_client_bank_credentials(self, auth_token, test_client):
        """GET /api/clients/{id}/bank-credentials - get all credentials"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        client_id = test_client["id"]
        
        response = requests.get(f"{BASE_URL}/api/clients/{client_id}/bank-credentials", headers=headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
        print(f"✅ GET /api/clients/{client_id}/bank-credentials returns credentials list")


class TestClientAdditionalEmails:
    """Test /api/clients/{id}/emails endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get commercialista auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COMMERCIALISTA_EMAIL,
            "password": COMMERCIALISTA_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture
    def test_client(self, auth_token):
        """Get a test client"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        clients = clients_response.json()
        if clients:
            return {"id": clients[0]["id"], "email": clients[0]["email"]}
        pytest.skip("No test client available")
    
    def test_add_additional_email_to_client(self, auth_token, test_client):
        """POST /api/clients/{id}/emails - add additional email"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        client_id = test_client["id"]
        test_email = f"TEST_additional_{uuid.uuid4().hex[:6]}@test.com"
        
        # Use form data for email
        response = requests.post(f"{BASE_URL}/api/clients/{client_id}/emails", 
            data={"email": test_email},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["email"] == test_email
        
        print(f"✅ POST /api/clients/{client_id}/emails adds additional email successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client_id}/emails/{test_email}", headers=headers)
    
    def test_cannot_add_duplicate_email(self, auth_token, test_client):
        """POST /api/clients/{id}/emails - should fail for primary email"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        client_id = test_client["id"]
        primary_email = test_client["email"]
        
        # Try adding the primary email as additional
        response = requests.post(f"{BASE_URL}/api/clients/{client_id}/emails", 
            data={"email": primary_email},
            headers=headers
        )
        
        assert response.status_code == 400
        print("✅ POST /api/clients/{id}/emails correctly rejects duplicate email")


class TestConsulenteDelLavoro:
    """Test /api/consulenti endpoints - Consulente management"""
    
    @pytest.fixture
    def auth_token(self):
        """Get commercialista auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COMMERCIALISTA_EMAIL,
            "password": COMMERCIALISTA_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_create_consulente(self, auth_token):
        """POST /api/consulenti - create new consulente del lavoro"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        test_email = f"TEST_consulente_{uuid.uuid4().hex[:6]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/consulenti", 
            json={
                "email": test_email,
                "password": "TestConsulente123!",
                "full_name": "Test Consulente Lavoro"
            },
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "id" in data
        consulente_id = data["id"]
        
        print(f"✅ POST /api/consulenti creates consulente del lavoro successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/consulenti/{consulente_id}", headers=headers)
    
    def test_get_consulenti_list(self, auth_token):
        """GET /api/consulenti - get list of consulenti"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/consulenti", headers=headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
        print("✅ GET /api/consulenti returns list of consulenti")
    
    def test_assign_clients_to_consulente(self, auth_token):
        """POST /api/consulenti/{id}/assign-clients - assign clients"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test consulente
        test_email = f"TEST_consulente_assign_{uuid.uuid4().hex[:6]}@test.com"
        create_response = requests.post(f"{BASE_URL}/api/consulenti", 
            json={
                "email": test_email,
                "password": "TestConsulente123!",
                "full_name": "Test Consulente Assign"
            },
            headers=headers
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test consulente")
        
        consulente_id = create_response.json()["id"]
        
        # Get clients list
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        clients = clients_response.json()
        
        if not clients:
            # Cleanup and skip
            requests.delete(f"{BASE_URL}/api/consulenti/{consulente_id}", headers=headers)
            pytest.skip("No clients available to assign")
        
        # Assign first client
        client_ids = [clients[0]["id"]]
        assign_response = requests.post(
            f"{BASE_URL}/api/consulenti/{consulente_id}/assign-clients",
            json={"client_ids": client_ids},
            headers=headers
        )
        
        assert assign_response.status_code == 200
        data = assign_response.json()
        assert data["success"] == True
        assert data["assigned_count"] == 1
        
        print(f"✅ POST /api/consulenti/{consulente_id}/assign-clients assigns client successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/consulenti/{consulente_id}", headers=headers)


class TestConsulenteLogin:
    """Test consulente login and dashboard endpoints"""
    
    @pytest.fixture
    def consulente_auth(self):
        """Create and login as consulente"""
        # First login as commercialista
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COMMERCIALISTA_EMAIL,
            "password": COMMERCIALISTA_PASSWORD
        })
        comm_token = response.json()["access_token"]
        comm_headers = {"Authorization": f"Bearer {comm_token}"}
        
        # Create test consulente
        test_email = f"TEST_consulente_login_{uuid.uuid4().hex[:6]}@test.com"
        test_password = "TestConsulente123!"
        
        create_response = requests.post(f"{BASE_URL}/api/consulenti", 
            json={
                "email": test_email,
                "password": test_password,
                "full_name": "Test Consulente Login"
            },
            headers=comm_headers
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test consulente")
        
        consulente_id = create_response.json()["id"]
        
        # Assign a client to consulente
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=comm_headers)
        clients = clients_response.json()
        if clients:
            requests.post(
                f"{BASE_URL}/api/consulenti/{consulente_id}/assign-clients",
                json={"client_ids": [clients[0]["id"]]},
                headers=comm_headers
            )
        
        # Login as consulente
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        
        if login_response.status_code != 200:
            # Cleanup and skip
            requests.delete(f"{BASE_URL}/api/consulenti/{consulente_id}", headers=comm_headers)
            pytest.skip("Consulente login failed")
        
        consulente_token = login_response.json()["access_token"]
        
        return {
            "token": consulente_token,
            "id": consulente_id,
            "email": test_email,
            "comm_headers": comm_headers
        }
    
    def test_consulente_can_login(self, consulente_auth):
        """Consulente should be able to login with credentials"""
        assert consulente_auth["token"] is not None
        print("✅ Consulente can login successfully")
    
    def test_consulente_gets_clients(self, consulente_auth):
        """GET /api/consulente/clients - consulente sees assigned clients"""
        headers = {"Authorization": f"Bearer {consulente_auth['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/consulente/clients", headers=headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
        print("✅ GET /api/consulente/clients returns assigned clients")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/consulenti/{consulente_auth['id']}", headers=consulente_auth["comm_headers"])
    
    def test_consulente_gets_stats(self, consulente_auth):
        """GET /api/consulente/stats - consulente dashboard stats"""
        headers = {"Authorization": f"Bearer {consulente_auth['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/consulente/stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "clients_assigned" in data
        assert "total_payslips" in data
        
        print("✅ GET /api/consulente/stats returns dashboard statistics")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/consulenti/{consulente_auth['id']}", headers=consulente_auth["comm_headers"])


class TestClientTypeFilter:
    """Test client type filter functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get commercialista auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COMMERCIALISTA_EMAIL,
            "password": COMMERCIALISTA_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_filter_clients_by_tipo(self, auth_token):
        """GET /api/clients?tipo_cliente=autonomo - filter by type"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test each filter type
        for tipo in ["autonomo", "societa", "privato"]:
            response = requests.get(f"{BASE_URL}/api/clients?tipo_cliente={tipo}", headers=headers)
            assert response.status_code == 200
            clients = response.json()
            
            # All returned clients should have matching tipo_cliente
            for client in clients:
                assert client.get("tipo_cliente") == tipo, f"Client has wrong tipo_cliente: {client.get('tipo_cliente')}"
        
        print("✅ GET /api/clients?tipo_cliente=X correctly filters clients by type")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
