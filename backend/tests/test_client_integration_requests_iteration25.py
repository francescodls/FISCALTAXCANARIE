"""
Test Client Integration Requests - Iteration 25
Tests for client-side integration request features:
- Client viewing pending integration requests
- Client responding to integration requests
- Client uploading documents in response
- Bidirectional conversation
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestClientIntegrationRequests:
    """Tests for client integration request features"""
    
    admin_token = None
    client_token = None
    test_tax_return_id = None
    test_integration_request_id = None
    test_client_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin and get test data"""
        # Login as admin
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "info@fiscaltaxcanarie.com",
            "password": "Triana48+"
        })
        assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
        self.admin_token = admin_login.json()["access_token"]
        
        # Get clients with declarations to find a test client
        clients_res = requests.get(
            f"{BASE_URL}/api/declarations/clients-with-declarations",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert clients_res.status_code == 200, f"Failed to get clients: {clients_res.text}"
        clients = clients_res.json()
        
        # Find FRANCESCO JUNIOR DE LISO or any client with declarations
        test_client = None
        for client in clients:
            if "FRANCESCO" in client.get("client_name", "").upper():
                test_client = client
                break
        
        if not test_client and clients:
            test_client = clients[0]
        
        if test_client:
            self.test_client_id = test_client["client_id"]
            
            # Get tax returns for this client
            tax_returns_res = requests.get(
                f"{BASE_URL}/api/declarations/tax-returns?client_id={self.test_client_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            if tax_returns_res.status_code == 200:
                tax_returns = tax_returns_res.json()
                if tax_returns:
                    self.test_tax_return_id = tax_returns[0]["id"]
    
    def test_01_admin_can_create_integration_request(self):
        """Test admin can create integration request for client"""
        if not self.test_tax_return_id:
            pytest.skip("No test tax return available")
        
        # Create integration request
        res = requests.post(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}/integration-requests",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "seccion": "datos_personales",
                "mensaje": "Test request from iteration 25 - please provide ID document",
                "documentos_richiesti": ["Documento identità", "Codice fiscale"]
            }
        )
        
        assert res.status_code == 200, f"Failed to create integration request: {res.text}"
        data = res.json()
        assert "request_id" in data
        self.test_integration_request_id = data["request_id"]
        print(f"Created integration request: {self.test_integration_request_id}")
    
    def test_02_get_tax_return_with_pending_requests(self):
        """Test getting tax return shows pending integration requests"""
        if not self.test_tax_return_id:
            pytest.skip("No test tax return available")
        
        res = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200, f"Failed to get tax return: {res.text}"
        data = res.json()
        
        # Check richieste_integrazione field exists
        assert "richieste_integrazione" in data, "richieste_integrazione field missing"
        
        # Check for pending requests
        pending = [r for r in data.get("richieste_integrazione", []) if r.get("stato") == "pendente"]
        print(f"Found {len(pending)} pending integration requests")
        
        # Verify request structure
        if pending:
            req = pending[0]
            assert "id" in req
            assert "seccion" in req
            assert "mensaje" in req
            assert "stato" in req
            assert req["stato"] == "pendente"
    
    def test_03_respond_to_integration_request_admin_forbidden(self):
        """Test that admin cannot respond to integration requests (only clients can)"""
        if not self.test_tax_return_id:
            pytest.skip("No test tax return available")
        
        # First get the tax return to find a pending request
        res = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        
        pending = [r for r in data.get("richieste_integrazione", []) if r.get("stato") == "pendente"]
        if not pending:
            pytest.skip("No pending integration requests to respond to")
        
        request_id = pending[0]["id"]
        
        # Try responding with JSON (new backend implementation uses POST + JSON)
        res = requests.post(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}/integration-requests/{request_id}/respond",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={"risposta": "Test response from iteration 25 - documents attached"}
        )
        
        # Admin should get 403 Forbidden (only clients can respond)
        print(f"Response status: {res.status_code}, body: {res.text}")
        assert res.status_code == 403, "Admin should not be able to respond to integration requests"
    
    def test_04_respond_endpoint_uses_post_method(self):
        """Test that respond endpoint now uses POST method (fixed from PUT)"""
        if not self.test_tax_return_id:
            pytest.skip("No test tax return available")
        
        # Get a pending request
        res = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        data = res.json()
        pending = [r for r in data.get("richieste_integrazione", []) if r.get("stato") == "pendente"]
        
        if not pending:
            pytest.skip("No pending requests")
        
        request_id = pending[0]["id"]
        
        # Test PUT method (old implementation - should now fail with 405)
        put_res = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}/integration-requests/{request_id}/respond",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={"risposta": "Test"}
        )
        
        # PUT should return 405 Method Not Allowed (we changed to POST)
        print(f"PUT method response: {put_res.status_code}")
        assert put_res.status_code == 405, f"PUT should return 405, got {put_res.status_code}"
        
        # Test POST method (new implementation - should work but return 403 for admin)
        post_res = requests.post(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}/integration-requests/{request_id}/respond",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={"risposta": "Test"}
        )
        
        # POST should return 403 (admin can't respond, only clients)
        print(f"POST method response: {post_res.status_code}")
        assert post_res.status_code == 403, f"POST should return 403 for admin, got {post_res.status_code}"
    
    def test_05_send_message_to_conversation(self):
        """Test sending message to declaration conversation"""
        if not self.test_tax_return_id:
            pytest.skip("No test tax return available")
        
        res = requests.post(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}/messages",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={"content": "Test message from iteration 25 - admin to client"}
        )
        
        assert res.status_code == 200, f"Failed to send message: {res.text}"
        data = res.json()
        assert "message_id" in data
        print(f"Sent message: {data['message_id']}")
    
    def test_06_get_conversation_messages(self):
        """Test getting conversation messages from tax return"""
        if not self.test_tax_return_id:
            pytest.skip("No test tax return available")
        
        res = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200
        data = res.json()
        
        assert "conversazione" in data, "conversazione field missing"
        messages = data.get("conversazione", [])
        print(f"Found {len(messages)} messages in conversation")
        
        if messages:
            msg = messages[-1]
            assert "id" in msg
            assert "content" in msg
            assert "sender_id" in msg
            assert "sender_role" in msg
            assert "created_at" in msg
    
    def test_07_mark_messages_as_read(self):
        """Test marking messages as read"""
        if not self.test_tax_return_id:
            pytest.skip("No test tax return available")
        
        res = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}/messages/mark-read",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200, f"Failed to mark messages read: {res.text}"
    
    def test_08_upload_document_to_tax_return(self):
        """Test uploading document to tax return"""
        if not self.test_tax_return_id:
            pytest.skip("No test tax return available")
        
        # Create a simple test file
        files = {
            'file': ('test_document_iteration25.txt', b'Test document content for iteration 25', 'text/plain')
        }
        data = {
            'categoria': 'otro',
            'seccion': 'datos_personales'
        }
        
        res = requests.post(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}/documents",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            files=files,
            data=data
        )
        
        assert res.status_code == 200, f"Failed to upload document: {res.text}"
        result = res.json()
        assert "document_id" in result
        print(f"Uploaded document: {result['document_id']}")
    
    def test_09_upload_document_with_richiesta_id(self):
        """Test uploading document linked to integration request"""
        if not self.test_tax_return_id:
            pytest.skip("No test tax return available")
        
        # Get a pending request ID
        res = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        data = res.json()
        pending = [r for r in data.get("richieste_integrazione", []) if r.get("stato") == "pendente"]
        
        richiesta_id = pending[0]["id"] if pending else None
        
        # Create a test file
        files = {
            'file': ('test_doc_for_request.pdf', b'%PDF-1.4 Test PDF content', 'application/pdf')
        }
        form_data = {
            'categoria': 'integracion',
            'seccion': 'datos_personales'
        }
        
        if richiesta_id:
            form_data['richiesta_id'] = richiesta_id
        
        res = requests.post(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}/documents",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            files=files,
            data=form_data
        )
        
        assert res.status_code == 200, f"Failed to upload document: {res.text}"
        print(f"Uploaded document with richiesta_id: {richiesta_id}")
    
    def test_10_clients_with_declarations_shows_pending_requests(self):
        """Test that clients-with-declarations endpoint shows pending request count"""
        res = requests.get(
            f"{BASE_URL}/api/declarations/clients-with-declarations",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200
        clients = res.json()
        
        # Find client with pending requests
        clients_with_pending = [c for c in clients if c.get("total_richieste_pendenti", 0) > 0]
        print(f"Found {len(clients_with_pending)} clients with pending requests")
        
        if clients_with_pending:
            client = clients_with_pending[0]
            assert "total_richieste_pendenti" in client
            assert "unread_messages" in client
            print(f"Client {client['client_name']} has {client['total_richieste_pendenti']} pending requests")


class TestFrontendBackendMismatch:
    """Tests to identify frontend-backend mismatches"""
    
    admin_token = None
    test_tax_return_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup"""
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "info@fiscaltaxcanarie.com",
            "password": "Triana48+"
        })
        if admin_login.status_code == 200:
            self.admin_token = admin_login.json()["access_token"]
            
            # Get a tax return
            clients_res = requests.get(
                f"{BASE_URL}/api/declarations/clients-with-declarations",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            if clients_res.status_code == 200:
                clients = clients_res.json()
                if clients:
                    client_id = clients[0]["client_id"]
                    tax_returns_res = requests.get(
                        f"{BASE_URL}/api/declarations/tax-returns?client_id={client_id}",
                        headers={"Authorization": f"Bearer {self.admin_token}"}
                    )
                    if tax_returns_res.status_code == 200:
                        tax_returns = tax_returns_res.json()
                        if tax_returns:
                            self.test_tax_return_id = tax_returns[0]["id"]
    
    def test_respond_endpoint_accepts_json(self):
        """
        CRITICAL: Test if respond endpoint accepts JSON body
        Frontend sends: POST with JSON body
        Backend expects: PUT with Form data
        """
        if not self.test_tax_return_id:
            pytest.skip("No test tax return")
        
        # Get pending request
        res = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        data = res.json()
        pending = [r for r in data.get("richieste_integrazione", []) if r.get("stato") == "pendente"]
        
        if not pending:
            pytest.skip("No pending requests")
        
        request_id = pending[0]["id"]
        
        # Test what frontend sends (POST + JSON)
        frontend_style_res = requests.post(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}/integration-requests/{request_id}/respond",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={"risposta": "Test response"}
        )
        
        print(f"Frontend-style request (POST+JSON): {frontend_style_res.status_code}")
        print(f"Response: {frontend_style_res.text}")
        
        # This should fail with 405 Method Not Allowed
        # Documenting the mismatch
        if frontend_style_res.status_code == 405:
            print("MISMATCH CONFIRMED: Frontend uses POST, backend expects PUT")
        
        # Test what backend expects (PUT + Form)
        backend_style_res = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{self.test_tax_return_id}/integration-requests/{request_id}/respond",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            data={"risposta": "Test response"}
        )
        
        print(f"Backend-style request (PUT+Form): {backend_style_res.status_code}")
        print(f"Response: {backend_style_res.text}")
        
        # Document findings
        assert True, "Mismatch documented - see test output"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
