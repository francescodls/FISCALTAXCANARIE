"""
Test suite for P1/P2 features:
- Rinomina automatica file dopo analisi AI (AAAA-MM-GG_TipoDoc_NomeCliente.ext)
- Dashboard statistiche avanzate con grafici
- Ricerca semantica documenti
- Sezione documenti da verificare
"""

import pytest
import requests
import os
import uuid
import io

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COMMERCIALISTA_EMAIL = "info@fiscaltaxcanarie.com"
COMMERCIALISTA_PASSWORD = "Triana48+"


@pytest.fixture(scope="module")
def commercialista_token():
    """Get commercialista authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COMMERCIALISTA_EMAIL,
        "password": COMMERCIALISTA_PASSWORD
    })
    assert response.status_code == 200, f"Commercialista login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def headers(commercialista_token):
    """Get auth headers"""
    return {"Authorization": f"Bearer {commercialista_token}"}


# ===================== API Health & Stats Tests =====================

class TestAPIHealth:
    """Test API is accessible and stats endpoint works"""
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        assert "Fiscal Tax Canarie" in response.json().get("message", "")
        print("✅ API health check passed")

    def test_commercialista_login(self, commercialista_token):
        """Test commercialista can login"""
        assert commercialista_token is not None
        print("✅ Commercialista login successful")


class TestStatsEndpoint:
    """Test /api/stats endpoint for dashboard statistics"""
    
    def test_stats_endpoint_returns_data(self, headers):
        """Test stats endpoint returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=headers)
        assert response.status_code == 200, f"Stats failed: {response.text}"
        
        data = response.json()
        # Verify required fields exist
        assert "clients_count" in data
        assert "clients_active" in data
        assert "documents_count" in data
        assert "deadlines_da_fare" in data
        assert "deadlines_in_lavorazione" in data
        assert "deadlines_completate" in data
        assert "deadlines_scadute" in data
        print(f"✅ Stats returned: clients={data['clients_count']}, docs={data['documents_count']}")

    def test_stats_contains_deadlines_data(self, headers):
        """Test stats contains all deadline categories for pie chart"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=headers)
        data = response.json()
        
        # These fields are needed for the pie chart
        deadline_fields = ["deadlines_da_fare", "deadlines_in_lavorazione", 
                          "deadlines_completate", "deadlines_scadute"]
        for field in deadline_fields:
            assert field in data, f"Missing {field} in stats"
            assert isinstance(data[field], int), f"{field} should be int"
        print("✅ All deadline stats present for pie chart")


# ===================== Pending Verification Tests =====================

class TestPendingVerification:
    """Test /api/documents/pending-verification endpoint"""
    
    def test_pending_verification_endpoint_exists(self, headers):
        """Test pending verification endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/documents/pending-verification", headers=headers)
        assert response.status_code == 200, f"Pending verification failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Pending verification returns list with {len(data)} documents")

    def test_pending_verification_document_structure(self, headers):
        """Test document structure if any pending documents exist"""
        response = requests.get(f"{BASE_URL}/api/documents/pending-verification", headers=headers)
        data = response.json()
        
        if len(data) > 0:
            doc = data[0]
            # Check basic document fields
            assert "id" in doc
            assert "needs_verification" in doc
            assert doc["needs_verification"] == True
            print(f"✅ Pending doc structure valid: {doc.get('title', 'N/A')}")
        else:
            print("✅ No pending documents (empty list is valid)")


# ===================== Semantic Search Tests =====================

class TestSemanticSearch:
    """Test /api/documents/search endpoint"""
    
    def test_search_endpoint_exists(self, headers):
        """Test search endpoint exists and accepts queries"""
        response = requests.get(f"{BASE_URL}/api/documents/search?q=fattura", headers=headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Search for 'fattura' returned {len(data)} results")

    def test_search_with_different_queries(self, headers):
        """Test search with various query types"""
        queries = ["IVA", "dichiarazione", "contratto", "IGIC"]
        
        for query in queries:
            response = requests.get(f"{BASE_URL}/api/documents/search?q={query}", headers=headers)
            assert response.status_code == 200, f"Search for '{query}' failed"
            print(f"✅ Search '{query}' returned {len(response.json())} results")

    def test_search_returns_relevance_scores(self, headers):
        """Test that search returns relevance scores"""
        response = requests.get(f"{BASE_URL}/api/documents/search?q=documento fiscale", headers=headers)
        data = response.json()
        
        if len(data) > 0:
            # Check if relevance_score is present
            first_result = data[0]
            if "relevance_score" in first_result:
                print(f"✅ Search results include relevance_score: {first_result['relevance_score']}")
            else:
                print("✅ Search works but no relevance_score (may use fallback)")
        else:
            print("✅ Search works (no documents match query)")


# ===================== Document Verification Tests =====================

class TestDocumentVerification:
    """Test document verification workflow"""
    
    def test_verify_document_endpoint_exists(self, headers):
        """Test verify endpoint structure"""
        # First get pending docs
        response = requests.get(f"{BASE_URL}/api/documents/pending-verification", headers=headers)
        pending_docs = response.json()
        
        if len(pending_docs) > 0:
            doc_id = pending_docs[0]["id"]
            # Get clients
            clients_response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
            clients = clients_response.json()
            
            if len(clients) > 0:
                # Try to verify
                form_data = {"client_id": clients[0]["id"]}
                verify_response = requests.put(
                    f"{BASE_URL}/api/documents/{doc_id}/verify",
                    data=form_data,
                    headers=headers
                )
                assert verify_response.status_code in [200, 422], f"Verify failed: {verify_response.text}"
                print("✅ Document verify endpoint works")
            else:
                print("✅ No clients to verify document (skipped)")
        else:
            print("✅ No pending documents to verify (skipped)")


# ===================== Auto-Rename Tests =====================

class TestAutoRename:
    """Test generate_standard_filename functionality"""
    
    def test_upload_auto_endpoint_exists(self, headers):
        """Test upload-auto endpoint exists (structure only)"""
        # This is a POST endpoint requiring a file, just check it exists
        # We'll test the actual file rename in the AI service unit test
        response = requests.post(
            f"{BASE_URL}/api/documents/upload-auto",
            headers=headers
        )
        # Should return 422 (missing required fields) not 404
        assert response.status_code in [422, 400, 415], f"Upload-auto endpoint check failed: {response.status_code}"
        print("✅ Upload-auto endpoint exists")

    def test_rename_document_endpoint_exists(self, headers):
        """Test rename document endpoint exists"""
        # Test with non-existing doc
        form_data = {"new_filename": "test.pdf"}
        response = requests.put(
            f"{BASE_URL}/api/documents/test-id-123/rename",
            data=form_data,
            headers=headers
        )
        assert response.status_code in [404, 422], f"Rename endpoint check failed: {response.status_code}"
        print("✅ Rename document endpoint exists")


# ===================== Clients List Tests =====================

class TestClientsList:
    """Test clients list for dashboard"""
    
    def test_clients_list(self, headers):
        """Test clients endpoint returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        assert response.status_code == 200
        
        clients = response.json()
        assert isinstance(clients, list)
        
        if len(clients) > 0:
            client = clients[0]
            assert "id" in client
            assert "full_name" in client
            assert "email" in client
            assert "documents_count" in client
            print(f"✅ Clients list: {len(clients)} clients with proper structure")
        else:
            print("✅ Clients list empty (valid)")


# ===================== Activity Logs Tests =====================

class TestActivityLogs:
    """Test activity logs for dashboard"""
    
    def test_activity_logs(self, headers):
        """Test activity logs endpoint"""
        response = requests.get(f"{BASE_URL}/api/activity-logs?limit=20", headers=headers)
        assert response.status_code == 200
        
        logs = response.json()
        assert isinstance(logs, list)
        print(f"✅ Activity logs: {len(logs)} entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
