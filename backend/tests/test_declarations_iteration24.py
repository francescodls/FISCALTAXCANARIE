"""
Test suite for Declarations Admin View - Iteration 24
Tests the new admin declarations features:
- GET /api/declarations/clients-with-declarations
- POST /api/declarations/tax-returns/{id}/messages
- PUT /api/declarations/tax-returns/{id}/messages/mark-read
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://app.fiscaltaxcanarie.com')


class TestDeclarationsAdminView:
    """Tests for the new admin declarations view organized by client"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "info@fiscaltaxcanarie.com",
            "password": "Triana48+"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_login_admin(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "info@fiscaltaxcanarie.com",
            "password": "Triana48+"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "commercialista"
        print("✓ Admin login successful")
    
    def test_get_clients_with_declarations(self, admin_headers):
        """Test GET /api/declarations/clients-with-declarations"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/clients-with-declarations",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify structure of client summary
        if len(data) > 0:
            client = data[0]
            assert "client_id" in client
            assert "client_name" in client
            assert "client_email" in client
            assert "total_declarations" in client
            assert "declarations_bozza" in client
            assert "declarations_inviate" in client
            assert "declarations_in_revisione" in client
            assert "declarations_presentate" in client
            assert "declarations_doc_incompleta" in client
            assert "total_richieste_pendenti" in client
            assert "unread_messages" in client
            assert "last_activity" in client
            print(f"✓ Found {len(data)} clients with declarations")
            print(f"  First client: {client['client_name']} with {client['total_declarations']} declarations")
        else:
            print("✓ No clients with declarations found (empty list)")
    
    def test_get_clients_with_declarations_search_filter(self, admin_headers):
        """Test search filter on clients-with-declarations"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/clients-with-declarations?search=FRANCESCO",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # If there's a client named FRANCESCO, it should be in results
        for client in data:
            assert "FRANCESCO" in client["client_name"].upper() or "FRANCESCO" in (client.get("client_email") or "").upper()
        print(f"✓ Search filter works, found {len(data)} matching clients")
    
    def test_get_tax_returns_list(self, admin_headers):
        """Test GET /api/declarations/tax-returns"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            tr = data[0]
            assert "id" in tr
            assert "client_id" in tr
            assert "client_name" in tr
            assert "anno_fiscale" in tr
            assert "stato" in tr
            print(f"✓ Found {len(data)} tax returns")
        else:
            print("✓ No tax returns found")
        
        return data
    
    def test_get_tax_return_detail(self, admin_headers):
        """Test GET /api/declarations/tax-returns/{id}"""
        # First get list to find an ID
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns",
            headers=admin_headers
        )
        assert list_response.status_code == 200
        tax_returns = list_response.json()
        
        if len(tax_returns) == 0:
            pytest.skip("No tax returns to test detail view")
        
        tax_return_id = tax_returns[0]["id"]
        
        # Get detail
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify full structure
        assert data["id"] == tax_return_id
        assert "client_id" in data
        assert "client_name" in data
        assert "client_email" in data
        assert "anno_fiscale" in data
        assert "stato" in data
        assert "secciones_habilitadas" in data
        assert "documentos" in data
        assert "notas_cliente" in data
        assert "notas_admin" in data
        assert "richieste_integrazione" in data
        assert "conversazione" in data
        assert "autorizacion" in data
        assert "status_logs" in data
        print(f"✓ Tax return detail retrieved: {data['client_name']} - {data['anno_fiscale']}")
    
    def test_post_message_to_declaration(self, admin_headers):
        """Test POST /api/declarations/tax-returns/{id}/messages"""
        # First get a tax return ID
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns",
            headers=admin_headers
        )
        assert list_response.status_code == 200
        tax_returns = list_response.json()
        
        if len(tax_returns) == 0:
            pytest.skip("No tax returns to test messaging")
        
        tax_return_id = tax_returns[0]["id"]
        
        # Send message
        response = requests.post(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/messages",
            headers=admin_headers,
            json={"content": "Test message from pytest - iteration 24"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "message_id" in data
        assert data["message"] == "Messaggio inviato"
        print(f"✓ Message sent successfully, ID: {data['message_id']}")
        
        # Verify message appears in declaration
        detail_response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}",
            headers=admin_headers
        )
        assert detail_response.status_code == 200
        detail = detail_response.json()
        
        # Check conversazione contains the message
        messages = detail.get("conversazione", [])
        assert len(messages) > 0, "No messages found in conversazione"
        
        # Find our test message
        found = any("pytest" in msg.get("content", "") for msg in messages)
        assert found, "Test message not found in conversazione"
        print(f"✓ Message verified in declaration conversazione ({len(messages)} total messages)")
    
    def test_mark_messages_as_read(self, admin_headers):
        """Test PUT /api/declarations/tax-returns/{id}/messages/mark-read"""
        # First get a tax return ID
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns",
            headers=admin_headers
        )
        assert list_response.status_code == 200
        tax_returns = list_response.json()
        
        if len(tax_returns) == 0:
            pytest.skip("No tax returns to test mark-read")
        
        tax_return_id = tax_returns[0]["id"]
        
        # Mark messages as read
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/messages/mark-read",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Messaggi segnati come letti"
        print("✓ Messages marked as read successfully")
    
    def test_get_clients_with_pending_requests_filter(self, admin_headers):
        """Test has_pending_requests filter on clients-with-declarations"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/clients-with-declarations?has_pending_requests=true",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned clients should have pending requests
        for client in data:
            assert client["total_richieste_pendenti"] > 0
        print(f"✓ Pending requests filter works, found {len(data)} clients with pending requests")
    
    def test_get_tax_returns_by_client(self, admin_headers):
        """Test filtering tax returns by client_id"""
        # First get clients
        clients_response = requests.get(
            f"{BASE_URL}/api/declarations/clients-with-declarations",
            headers=admin_headers
        )
        assert clients_response.status_code == 200
        clients = clients_response.json()
        
        if len(clients) == 0:
            pytest.skip("No clients to test filtering")
        
        client_id = clients[0]["client_id"]
        
        # Get tax returns for this client
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns?client_id={client_id}",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned tax returns should belong to this client
        for tr in data:
            assert tr["client_id"] == client_id
        print(f"✓ Client filter works, found {len(data)} tax returns for client {clients[0]['client_name']}")
    
    def test_declaration_types(self, admin_headers):
        """Test GET /api/declarations/types"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/types",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "No declaration types found"
        
        # Verify structure
        dtype = data[0]
        assert "id" in dtype
        assert "code" in dtype
        assert "name" in dtype
        print(f"✓ Found {len(data)} declaration types")


class TestDeclarationsIntegrationRequests:
    """Tests for integration requests (document requests)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "info@fiscaltaxcanarie.com",
            "password": "Triana48+"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_integration_request(self, admin_headers):
        """Test POST /api/declarations/tax-returns/{id}/integration-requests"""
        # First get a tax return ID
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns",
            headers=admin_headers
        )
        assert list_response.status_code == 200
        tax_returns = list_response.json()
        
        if len(tax_returns) == 0:
            pytest.skip("No tax returns to test integration requests")
        
        tax_return_id = tax_returns[0]["id"]
        
        # Create integration request
        response = requests.post(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/integration-requests",
            headers=admin_headers,
            json={
                "seccion": "datos_personales",
                "mensaje": "Test integration request from pytest - please provide additional documents",
                "documentos_richiesti": ["Documento identità", "Codice fiscale"]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "request_id" in data
        print(f"✓ Integration request created, ID: {data['request_id']}")
        
        # Verify it appears in declaration
        detail_response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}",
            headers=admin_headers
        )
        assert detail_response.status_code == 200
        detail = detail_response.json()
        
        requests_list = detail.get("richieste_integrazione", [])
        assert len(requests_list) > 0, "No integration requests found"
        print(f"✓ Integration request verified in declaration ({len(requests_list)} total requests)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
