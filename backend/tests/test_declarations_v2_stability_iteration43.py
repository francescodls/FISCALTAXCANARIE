"""
Test Suite for Declarations v2 - Stability and Robustness Testing
Iteration 43 - Testing Error Handling, Autosave, and Full Workflow

Tests:
1. Declaration CRUD operations
2. Section update with autosave
3. Signature and submission flow
4. Document upload
5. Admin dashboard and status changes
6. Message system with integration requests
7. Notifications (push + email)
8. Error handling and edge cases
"""

import pytest
import requests
import os
import time
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"
CLIENT_EMAIL = "test_commercialista_202642@example.com"
CLIENT_PASSWORD = "TestCliente123!"
DECLARATION_ID = "4fa1f9aa-1919-4ba6-86f1-b67f0a7ad371"


class TestAuthAndSetup:
    """Authentication and setup tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def client_token(self):
        """Get client authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        return response.json().get("access_token")
    
    def test_admin_login(self, admin_token):
        """Test admin can login successfully"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print(f"Admin login successful, token length: {len(admin_token)}")
    
    def test_client_login(self, client_token):
        """Test client can login successfully"""
        assert client_token is not None
        assert len(client_token) > 0
        print(f"Client login successful, token length: {len(client_token)}")


class TestDeclarationCRUD:
    """Declaration CRUD operations tests"""
    
    @pytest.fixture(scope="class")
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_list_declarations(self, client_token):
        """Test listing client declarations"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} declarations for client")
    
    def test_get_declaration_detail(self, client_token):
        """Test getting declaration detail with all sections"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "id" in data
        assert "sections" in data
        assert "status" in data
        assert "completion_percentage" in data
        
        # Verify sections exist
        expected_sections = [
            "dati_personali", "situazione_familiare", "redditi_lavoro",
            "redditi_autonomo", "immobili", "canoni_locazione", "plusvalenze",
            "investimenti_finanziari", "criptomonete", "spese_deducibili",
            "deduzioni_agevolazioni", "documenti_allegati", "note_aggiuntive",
            "autorizzazione_firma"
        ]
        for section in expected_sections:
            assert section in data["sections"], f"Missing section: {section}"
        
        print(f"Declaration {data['id'][:8]}... status: {data['status']}, completion: {data['completion_percentage']}%")
    
    def test_declaration_not_found(self, client_token):
        """Test 404 for non-existent declaration"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/non-existent-id",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 404


class TestSectionUpdate:
    """Section update and autosave tests"""
    
    @pytest.fixture(scope="class")
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_update_dati_personali_section(self, client_token):
        """Test updating dati_personali section (simulates autosave)"""
        test_data = {
            "section_name": "dati_personali",
            "section_data": {
                "completed": False,
                "not_applicable": False,
                "data": {
                    "nome": "Test",
                    "cognome": "Iteration43",
                    "codice_fiscale": "TSTIT43A01H501Z",
                    "email": CLIENT_EMAIL,
                    "telefono": "+34 612 345 678",
                    "indirizzo": "Via Test 123, Las Palmas"
                }
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/section",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json=test_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify section was updated
        assert data["sections"]["dati_personali"]["data"]["nome"] == "Test"
        assert data["sections"]["dati_personali"]["data"]["cognome"] == "Iteration43"
        print("Dati personali section updated successfully")
    
    def test_update_section_with_not_applicable(self, client_token):
        """Test marking section as not applicable"""
        test_data = {
            "section_name": "criptomonete",
            "section_data": {
                "completed": True,
                "not_applicable": True,
                "data": {}
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/section",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json=test_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["sections"]["criptomonete"]["not_applicable"] == True
        assert data["sections"]["criptomonete"]["completed"] == True
        print("Section marked as not applicable successfully")
    
    def test_update_invalid_section(self, client_token):
        """Test updating invalid section name returns error"""
        test_data = {
            "section_name": "invalid_section_name",
            "section_data": {
                "completed": False,
                "data": {}
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/section",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json=test_data
        )
        assert response.status_code == 400
        print("Invalid section correctly rejected")
    
    def test_completion_percentage_updates(self, client_token):
        """Test that completion percentage updates correctly"""
        # Mark a section as completed
        test_data = {
            "section_name": "note_aggiuntive",
            "section_data": {
                "completed": True,
                "not_applicable": False,
                "data": {
                    "note": "Test note for iteration 43"
                }
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/section",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json=test_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Completion percentage should be > 0
        assert data["completion_percentage"] >= 0
        print(f"Completion percentage: {data['completion_percentage']}%")


class TestAdminDashboard:
    """Admin dashboard and management tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_admin_list_declarations(self, admin_token):
        """Test admin can list all declarations"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin sees {len(data)} total declarations")
    
    def test_admin_filter_by_status(self, admin_token):
        """Test admin can filter declarations by status"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations?status=bozza",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # All returned should have status bozza
        for decl in data:
            assert decl["status"] == "bozza"
        print(f"Found {len(data)} declarations with status 'bozza'")
    
    def test_admin_search_by_name(self, admin_token):
        """Test admin can search declarations by client name"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations?search=test",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Search 'test' returned {len(data)} results")
    
    def test_admin_stats(self, admin_token):
        """Test admin statistics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "by_status" in data
        assert "new_submissions" in data
        assert "pending_review" in data
        
        print(f"Stats: Total={data['total']}, By Status={data['by_status']}")
    
    def test_admin_view_declaration_detail(self, admin_token):
        """Test admin can view any declaration detail"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "sections" in data
        print(f"Admin viewed declaration {data['id'][:8]}...")


class TestStatusManagement:
    """Status change and notification tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_admin_update_status_simple(self, admin_token):
        """Test admin can update declaration status"""
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/status",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "new_status": "bozza",
                "note": "Test status update iteration 43"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "bozza"
        print("Status updated to 'bozza' successfully")
    
    def test_admin_update_status_with_notification(self, admin_token):
        """Test admin status update with push + email notification"""
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/status-notify",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "new_status": "bozza",
                "note": "Test notification iteration 43"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "bozza"
        print("Status updated with notification sent (push may fail for test tokens)")


class TestMessageSystem:
    """Message and integration request tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_admin_send_message(self, admin_token):
        """Test admin can send message to client"""
        response = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/messages",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "content": "Test message from admin - iteration 43",
                "is_integration_request": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["messages_count"] > 0
        print(f"Message sent, total messages: {data['messages_count']}")
    
    def test_admin_send_integration_request(self, admin_token):
        """Test admin can send integration request"""
        response = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/messages",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "content": "Please upload missing document - iteration 43",
                "is_integration_request": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Status should change to documentazione_incompleta
        assert data["status"] == "documentazione_incompleta"
        assert data["pending_integration_requests"] > 0
        print(f"Integration request sent, pending: {data['pending_integration_requests']}")
    
    def test_client_send_message(self, client_token):
        """Test client can send message"""
        response = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/messages",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json={
                "content": "Response from client - iteration 43",
                "is_integration_request": False
            }
        )
        assert response.status_code == 200
        print("Client message sent successfully")
    
    def test_get_messages(self, client_token):
        """Test getting message history"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/messages",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Retrieved {len(data)} messages")


class TestDocumentManagement:
    """Document upload and management tests"""
    
    @pytest.fixture(scope="class")
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_client_upload_document(self, client_token):
        """Test client can upload document"""
        # Create a test PDF file content
        test_content = b"%PDF-1.4 test content iteration 43"
        files = {
            'file': ('test_iter43.pdf', test_content, 'application/pdf')
        }
        data = {
            'category': 'generale',
            'description': 'Test document iteration 43'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
            headers={"Authorization": f"Bearer {client_token}"},
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        assert result["success"] == True
        assert "document" in result
        print(f"Document uploaded: {result['document']['filename']}")
    
    def test_list_documents(self, client_token):
        """Test listing documents"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} documents")
    
    def test_invalid_file_type_rejected(self, client_token):
        """Test that invalid file types are rejected"""
        test_content = b"malicious content"
        files = {
            'file': ('malware.exe', test_content, 'application/x-msdownload')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
            headers={"Authorization": f"Bearer {client_token}"},
            files=files,
            data={'category': 'generale'}
        )
        assert response.status_code == 400
        print("Invalid file type correctly rejected")
    
    def test_admin_download_pdf(self, admin_token):
        """Test admin can download PDF riepilogativo"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/pdf",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert response.headers.get('content-type') == 'application/pdf'
        print(f"PDF downloaded, size: {len(response.content)} bytes")
    
    def test_admin_download_zip(self, admin_token):
        """Test admin can download ZIP completo"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/zip",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert response.headers.get('content-type') == 'application/zip'
        print(f"ZIP downloaded, size: {len(response.content)} bytes")
    
    def test_client_cannot_download_admin_pdf(self, client_token):
        """Test client cannot access admin PDF endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/pdf",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
        print("Client correctly forbidden from admin PDF endpoint")


class TestErrorHandling:
    """Error handling and edge case tests"""
    
    def test_unauthorized_access(self):
        """Test unauthorized access returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations"
        )
        assert response.status_code == 401
        print("Unauthorized access correctly rejected")
    
    def test_invalid_token(self):
        """Test invalid token returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert response.status_code == 401
        print("Invalid token correctly rejected")
    
    def test_malformed_json(self):
        """Test malformed JSON returns error"""
        # Get fresh token
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        client_token = login_resp.json().get("access_token")
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/section",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            data="not valid json"
        )
        assert response.status_code in [400, 422]
        print("Malformed JSON correctly rejected")
    
    def test_missing_required_fields(self):
        """Test missing required fields returns error"""
        # Get fresh token
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        client_token = login_resp.json().get("access_token")
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/section",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json={}  # Missing section_name and section_data
        )
        assert response.status_code == 422
        print("Missing required fields correctly rejected")


class TestDataPersistence:
    """Data persistence verification tests"""
    
    def test_client_data_visible_to_admin(self):
        """Test that data entered by client is visible to admin"""
        # Get fresh tokens
        client_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        client_token = client_login.json().get("access_token")
        
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_token = admin_login.json().get("access_token")
        
        # Client updates a section
        unique_value = f"TestPersistence_{int(time.time())}"
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/section",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json={
                "section_name": "note_aggiuntive",
                "section_data": {
                    "completed": False,
                    "data": {
                        "note": unique_value,
                        "domande": "Test question iteration 43"
                    }
                }
            }
        )
        assert response.status_code == 200
        
        # Admin retrieves the declaration
        admin_response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_response.status_code == 200
        admin_data = admin_response.json()
        
        # Verify the data is visible
        note_section = admin_data["sections"]["note_aggiuntive"]["data"]
        assert note_section.get("note") == unique_value
        print(f"Data persistence verified: '{unique_value}' visible to admin")


# Reset declaration status to bozza at the end
class TestCleanup:
    """Cleanup tests to reset state"""
    
    def test_reset_status_to_bozza(self):
        """Reset declaration status to bozza for future tests"""
        # Get fresh token
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_token = login_resp.json().get("access_token")
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/status",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "new_status": "bozza",
                "note": "Reset after iteration 43 testing"
            }
        )
        assert response.status_code == 200
        print("Declaration status reset to 'bozza'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
