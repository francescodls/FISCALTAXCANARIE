"""
Test iteration 5 features:
- Tab Anagrafica - visualizzazione tutti i campi (NIE, NIF, CIF, IBAN, indirizzo)
- Tab Anagrafica - modifica dati cliente
- Tab Anagrafica - archiviazione cliente
- Pagina Gestione Liste - creazione nuova lista
- Pagina Gestione Liste - aggiunta cliente a lista
- Pagina Gestione Liste - invio notifica a lista
- Pagina Gestione Liste - tab Caricamento Globale
- API /api/documents/upload-batch - upload multiplo documenti
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COMMERCIALISTA_EMAIL = "info@fiscaltaxcanarie.com"
COMMERCIALISTA_PASSWORD = "Triana48+"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for commercialista"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COMMERCIALISTA_EMAIL,
        "password": COMMERCIALISTA_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Returns headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_accessible(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        assert "Fiscal Tax Canarie" in response.text
        print("✅ API accessible")


class TestClientAnagraficaExtended:
    """Test extended client fields (NIE, NIF, CIF, IBAN, indirizzo)"""
    
    def test_get_clients_returns_extended_fields(self, auth_headers):
        """Test that clients endpoint returns all extended fields"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Found {len(data)} clients")
        
        if len(data) > 0:
            client = data[0]
            # Check that extended fields are present in response structure
            expected_fields = ["nie", "nif", "cif", "tipo_cliente"]
            for field in expected_fields:
                assert field in client or field in client, f"Field {field} missing from client response"
            print(f"✅ Extended fields available in client structure")
    
    def test_create_test_client_for_update(self, auth_headers):
        """Create a test client for update tests"""
        # First try to find existing test client
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        clients = response.json()
        
        test_client = None
        for c in clients:
            if "TEST_Iteration5" in c.get("full_name", ""):
                test_client = c
                break
        
        if not test_client:
            # Register a new test client
            register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": "test_iteration5_cliente@test.com",
                "password": "TestIteration5!",
                "full_name": "TEST_Iteration5_Cliente",
                "phone": "+34 600 000 000",
                "tipo_cliente": "autonomo"
            })
            # It might fail if already exists, that's ok
            if register_response.status_code == 200:
                print("✅ Test client created")
            else:
                print(f"ℹ️ Test client creation returned {register_response.status_code}")
        
    def test_update_client_with_extended_fields(self, auth_headers):
        """Test updating client with NIE, NIF, CIF, IBAN, indirizzo"""
        # Get clients first
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        clients = response.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available for update test")
        
        # Use first client
        client_id = clients[0]["id"]
        
        # Test update with extended fields
        update_data = {
            "nie": "X-1234567-A",
            "nif": "12345678A",
            "cif": "B12345678",
            "iban": "ES12 1234 5678 9012 3456 7890",
            "indirizzo": "Calle Test, 123",
            "citta": "Las Palmas de Gran Canaria",
            "cap": "35001",
            "provincia": "Las Palmas",
            "regime_fiscale": "Regime ordinario",
            "tipo_attivita": "Commercio"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/clients/{client_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        print(f"✅ Client {client_id} updated with extended fields")
        
        # Verify update persisted
        get_response = requests.get(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
        assert get_response.status_code == 200
        client_data = get_response.json()
        
        # Verify some fields
        assert client_data.get("nie") == "X-1234567-A", f"NIE not saved correctly"
        assert client_data.get("iban") == "ES12 1234 5678 9012 3456 7890", f"IBAN not saved correctly"
        print(f"✅ Extended fields persisted correctly (NIE, IBAN verified)")
    
    def test_update_client_tipo_cliente(self, auth_headers):
        """Test updating client type (autonomo, societa, privato)"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        clients = response.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available for update test")
        
        client_id = clients[0]["id"]
        
        # Update tipo_cliente
        update_response = requests.put(
            f"{BASE_URL}/api/clients/{client_id}",
            json={"tipo_cliente": "societa"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        print(f"✅ Client tipo_cliente updated to societa")
        
        # Revert
        requests.put(
            f"{BASE_URL}/api/clients/{client_id}",
            json={"tipo_cliente": "autonomo"},
            headers=auth_headers
        )


class TestClientArchive:
    """Test client archiviation (soft delete)"""
    
    def test_archive_client(self, auth_headers):
        """Test archiving a client (stato = cessato)"""
        # Get clients
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        clients = response.json()
        
        # Find a test client or create one
        test_client = None
        for c in clients:
            if "TEST_" in c.get("full_name", "") or "test" in c.get("email", "").lower():
                test_client = c
                break
        
        if not test_client:
            # Create test client for deletion
            register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": "test_archive_delete@test.com",
                "password": "TestArchive123!",
                "full_name": "TEST_ArchiveClient",
                "tipo_cliente": "privato"
            })
            if register_response.status_code == 200:
                test_client = {"id": register_response.json()["user"]["id"]}
            else:
                # Get clients again
                response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
                clients = response.json()
                if len(clients) > 0:
                    test_client = clients[-1]  # Use last client
        
        if not test_client:
            pytest.skip("No test client available for archive test")
        
        client_id = test_client["id"]
        
        # Archive (soft delete) - permanent=false
        archive_response = requests.delete(
            f"{BASE_URL}/api/clients/{client_id}?permanent=false",
            headers=auth_headers
        )
        
        assert archive_response.status_code == 200
        assert "archiviato" in archive_response.json().get("message", "").lower() or "archiv" in str(archive_response.json()).lower()
        print(f"✅ Client {client_id} archived successfully")
        
        # Verify status changed to cessato
        get_response = requests.get(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
        if get_response.status_code == 200:
            assert get_response.json().get("stato") == "cessato", "Client not marked as cessato"
            print(f"✅ Client stato is 'cessato'")


class TestClientLists:
    """Test client lists feature"""
    
    def test_get_client_lists(self, auth_headers):
        """Test getting all client lists"""
        response = requests.get(f"{BASE_URL}/api/client-lists", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Retrieved {len(data)} client lists")
        
        if len(data) > 0:
            # Verify structure
            list_item = data[0]
            assert "id" in list_item
            assert "name" in list_item
            assert "color" in list_item
            print(f"✅ List structure verified: {list_item['name']}")
    
    def test_create_client_list(self, auth_headers):
        """Test creating a new client list"""
        list_data = {
            "name": "TEST_Lista_Iteration5",
            "description": "Test list for iteration 5 testing",
            "color": "#ff5733"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/client-lists",
            json=list_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create list failed: {response.text}"
        result = response.json()
        assert "id" in result
        print(f"✅ Client list created with id: {result['id']}")
        
        return result["id"]
    
    def test_add_client_to_list(self, auth_headers):
        """Test adding a client to a list"""
        # Get clients
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        clients = clients_response.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available")
        
        client_id = clients[0]["id"]
        
        # Get lists
        lists_response = requests.get(f"{BASE_URL}/api/client-lists", headers=auth_headers)
        lists = lists_response.json()
        
        if len(lists) == 0:
            pytest.skip("No lists available")
        
        list_id = lists[0]["id"]
        
        # Add client to list
        add_response = requests.post(
            f"{BASE_URL}/api/client-lists/{list_id}/clients/{client_id}",
            headers=auth_headers
        )
        
        assert add_response.status_code == 200
        print(f"✅ Client {client_id} added to list {list_id}")
        
    def test_remove_client_from_list(self, auth_headers):
        """Test removing a client from a list"""
        # Get lists
        lists_response = requests.get(f"{BASE_URL}/api/client-lists", headers=auth_headers)
        lists = lists_response.json()
        
        if len(lists) == 0:
            pytest.skip("No lists available")
        
        # Find a list with clients
        list_id = lists[0]["id"]
        
        # Get clients in list
        clients_response = requests.get(
            f"{BASE_URL}/api/clients?list_id={list_id}",
            headers=auth_headers
        )
        clients = clients_response.json()
        
        if len(clients) == 0:
            # Add a client first
            all_clients = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers).json()
            if len(all_clients) > 0:
                requests.post(
                    f"{BASE_URL}/api/client-lists/{list_id}/clients/{all_clients[0]['id']}",
                    headers=auth_headers
                )
                clients = [all_clients[0]]
        
        if len(clients) == 0:
            pytest.skip("No clients in list to remove")
        
        client_id = clients[0]["id"]
        
        # Remove client from list
        remove_response = requests.delete(
            f"{BASE_URL}/api/client-lists/{list_id}/clients/{client_id}",
            headers=auth_headers
        )
        
        assert remove_response.status_code == 200
        print(f"✅ Client {client_id} removed from list {list_id}")
    
    def test_send_notification_to_list(self, auth_headers):
        """Test sending notification to all clients in a list"""
        # Get lists
        lists_response = requests.get(f"{BASE_URL}/api/client-lists", headers=auth_headers)
        lists = lists_response.json()
        
        if len(lists) == 0:
            pytest.skip("No lists available")
        
        list_id = lists[0]["id"]
        
        # Send notification (multipart form data)
        notification_response = requests.post(
            f"{BASE_URL}/api/client-lists/{list_id}/send-notification",
            data={
                "subject": "Test Notification Iteration5",
                "content": "This is a test notification from iteration 5 testing."
            },
            headers=auth_headers
        )
        
        # May succeed or fail based on clients in list
        assert notification_response.status_code in [200, 400], f"Unexpected status: {notification_response.status_code}"
        print(f"✅ Send notification endpoint called: {notification_response.json()}")


class TestBatchUpload:
    """Test batch document upload API"""
    
    def test_upload_batch_endpoint_exists(self, auth_headers):
        """Test that upload-batch endpoint exists (expects 422 for missing files)"""
        response = requests.post(
            f"{BASE_URL}/api/documents/upload-batch",
            headers=auth_headers
        )
        
        # Should return 422 (validation error) for missing files, not 404
        assert response.status_code in [422, 400], f"Expected 422/400, got {response.status_code}"
        print(f"✅ upload-batch endpoint exists (returned {response.status_code} for missing files)")
    
    def test_upload_batch_with_test_file(self, auth_headers):
        """Test batch upload with a test file"""
        import io
        
        # Create simple PDF-like content (just for testing endpoint)
        test_content = b"%PDF-1.4\nTest PDF content for batch upload\n%%EOF"
        
        files = [
            ("files", ("test_document_1.pdf", io.BytesIO(test_content), "application/pdf")),
            ("files", ("test_document_2.pdf", io.BytesIO(test_content), "application/pdf"))
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload-batch",
            files=files,
            headers=auth_headers
        )
        
        # Should return 200 with results
        assert response.status_code == 200, f"Batch upload failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "results" in data
        assert "message" in data
        print(f"✅ Batch upload successful: {data['message']}")
        print(f"   Results: {len(data['results'])} files processed")
        print(f"   Needs verification: {data.get('needs_verification_count', 0)}")
        print(f"   Assigned: {data.get('assigned_count', 0)}")


class TestDeleteClientList:
    """Test deleting client lists"""
    
    def test_delete_test_lists(self, auth_headers):
        """Clean up test lists"""
        lists_response = requests.get(f"{BASE_URL}/api/client-lists", headers=auth_headers)
        lists = lists_response.json()
        
        for lst in lists:
            if "TEST_" in lst.get("name", ""):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/client-lists/{lst['id']}",
                    headers=auth_headers
                )
                if delete_response.status_code == 200:
                    print(f"✅ Deleted test list: {lst['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
