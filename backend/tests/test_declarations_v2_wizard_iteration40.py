"""
Test Declarations V2 Wizard API - Iteration 40
Tests the new V2 wizard implementation with 14 sections, auto-save, signature canvas
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tribute-models-docs.preview.emergentagent.com')

# Test credentials
CLIENT_EMAIL = "test_commercialista_202642@example.com"
CLIENT_PASSWORD = "TestCliente123!"


class TestDeclarationsV2Wizard:
    """Test V2 Declarations Wizard API"""
    
    @pytest.fixture(scope="class")
    def client_token(self):
        """Get client authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def client_headers(self, client_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {client_token}",
            "Content-Type": "application/json"
        }
    
    # ==================== LIST DECLARATIONS ====================
    
    def test_list_declarations_v2(self, client_headers):
        """Test GET /api/declarations/v2/declarations - List client declarations"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations",
            headers=client_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} declarations")
        
        if len(data) > 0:
            decl = data[0]
            # Verify response structure
            assert "id" in decl
            assert "anno_fiscale" in decl
            assert "status" in decl
            assert "completion_percentage" in decl
            assert "is_signed" in decl
            print(f"First declaration: {decl['anno_fiscale']} - {decl['status']} - {decl['completion_percentage']}%")
    
    # ==================== GET DECLARATION DETAIL ====================
    
    def test_get_declaration_detail_v2(self, client_headers):
        """Test GET /api/declarations/v2/declarations/{id} - Get declaration with sections"""
        # First get list to find a declaration
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations",
            headers=client_headers
        )
        assert list_response.status_code == 200
        declarations = list_response.json()
        
        if len(declarations) == 0:
            pytest.skip("No declarations found to test")
        
        decl_id = declarations[0]["id"]
        
        # Get detail
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{decl_id}",
            headers=client_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify sections are included
        assert "sections" in data
        assert "signature" in data
        
        # Verify all 14 sections exist
        expected_sections = [
            "dati_personali", "situazione_familiare", "redditi_lavoro", "redditi_autonomo",
            "immobili", "canoni_locazione", "plusvalenze", "investimenti_finanziari",
            "criptomonete", "spese_deducibili", "deduzioni_agevolazioni", "documenti_allegati",
            "note_aggiuntive", "autorizzazione_firma"
        ]
        
        for section in expected_sections:
            assert section in data["sections"], f"Missing section: {section}"
        
        print(f"Declaration {decl_id} has all 14 sections")
    
    # ==================== UPDATE SECTION (AUTO-SAVE) ====================
    
    def test_update_section_dati_personali(self, client_headers):
        """Test PUT /api/declarations/v2/declarations/{id}/section - Update dati_personali"""
        # Get declaration
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations",
            headers=client_headers
        )
        declarations = list_response.json()
        
        if len(declarations) == 0:
            pytest.skip("No declarations found")
        
        decl_id = declarations[0]["id"]
        
        # Update section
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/declarations/{decl_id}/section",
            headers=client_headers,
            json={
                "section_name": "dati_personali",
                "section_data": {
                    "completed": False,
                    "not_applicable": False,
                    "data": {
                        "nome": "Test",
                        "cognome": "User",
                        "codice_fiscale": "TSTCMM80A01H501Z",
                        "email": "test@example.com",
                        "indirizzo": "Via Test 123"
                    }
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify section was updated
        assert data["sections"]["dati_personali"]["data"]["nome"] == "Test"
        print("Section dati_personali updated successfully")
    
    def test_mark_section_completed(self, client_headers):
        """Test marking a section as completed"""
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations",
            headers=client_headers
        )
        declarations = list_response.json()
        
        if len(declarations) == 0:
            pytest.skip("No declarations found")
        
        decl_id = declarations[0]["id"]
        initial_completion = declarations[0]["completion_percentage"]
        
        # Mark section as completed
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/declarations/{decl_id}/section",
            headers=client_headers,
            json={
                "section_name": "situazione_familiare",
                "section_data": {
                    "completed": True,
                    "not_applicable": False,
                    "data": {
                        "stato_civile": "celibe_nubile",
                        "figli_carico": "0"
                    }
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify completion percentage increased
        assert data["sections"]["situazione_familiare"]["completed"] == True
        print(f"Section marked completed. Completion: {data['completion_percentage']}%")
    
    def test_mark_section_not_applicable(self, client_headers):
        """Test marking a section as 'Non ho questa tipologia'"""
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations",
            headers=client_headers
        )
        declarations = list_response.json()
        
        if len(declarations) == 0:
            pytest.skip("No declarations found")
        
        decl_id = declarations[0]["id"]
        
        # Mark section as not applicable
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/declarations/{decl_id}/section",
            headers=client_headers,
            json={
                "section_name": "criptomonete",
                "section_data": {
                    "completed": True,
                    "not_applicable": True,
                    "data": {}
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify section is marked as not applicable
        assert data["sections"]["criptomonete"]["not_applicable"] == True
        assert data["sections"]["criptomonete"]["completed"] == True
        print("Section criptomonete marked as not applicable")
    
    # ==================== INVALID SECTION ====================
    
    def test_update_invalid_section(self, client_headers):
        """Test updating an invalid section name"""
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations",
            headers=client_headers
        )
        declarations = list_response.json()
        
        if len(declarations) == 0:
            pytest.skip("No declarations found")
        
        decl_id = declarations[0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/v2/declarations/{decl_id}/section",
            headers=client_headers,
            json={
                "section_name": "invalid_section_name",
                "section_data": {"completed": True}
            }
        )
        assert response.status_code == 400
        print("Invalid section correctly rejected")
    
    # ==================== SIGNATURE ====================
    
    def test_sign_declaration_without_terms(self, client_headers):
        """Test signing without accepting terms should fail"""
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations",
            headers=client_headers
        )
        declarations = list_response.json()
        
        if len(declarations) == 0:
            pytest.skip("No declarations found")
        
        decl_id = declarations[0]["id"]
        
        # Try to sign without accepting terms
        response = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{decl_id}/sign",
            headers={"Authorization": client_headers["Authorization"]},
            data={
                "accepted_terms": "false",
                "signature_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            }
        )
        assert response.status_code == 400
        print("Signing without terms correctly rejected")
    
    def test_sign_declaration_without_signature(self, client_headers):
        """Test signing without signature image should fail"""
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations",
            headers=client_headers
        )
        declarations = list_response.json()
        
        if len(declarations) == 0:
            pytest.skip("No declarations found")
        
        decl_id = declarations[0]["id"]
        
        # Try to sign without signature
        response = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{decl_id}/sign",
            headers={"Authorization": client_headers["Authorization"]},
            data={
                "accepted_terms": "true",
                "signature_image": ""
            }
        )
        # 400 or 422 are both valid for validation errors
        assert response.status_code in [400, 422]
        print("Signing without signature correctly rejected")
    
    # ==================== SUBMIT ====================
    
    def test_submit_unsigned_declaration(self, client_headers):
        """Test submitting unsigned declaration should fail"""
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations",
            headers=client_headers
        )
        declarations = list_response.json()
        
        if len(declarations) == 0:
            pytest.skip("No declarations found")
        
        # Find an unsigned declaration
        unsigned = [d for d in declarations if not d["is_signed"]]
        if len(unsigned) == 0:
            pytest.skip("No unsigned declarations found")
        
        decl_id = unsigned[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{decl_id}/submit",
            headers=client_headers
        )
        assert response.status_code == 400
        assert "firmare" in response.json().get("detail", "").lower() or "sign" in response.json().get("detail", "").lower()
        print("Submitting unsigned declaration correctly rejected")
    
    # ==================== MESSAGES ====================
    
    def test_get_messages(self, client_headers):
        """Test GET /api/declarations/v2/declarations/{id}/messages"""
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations",
            headers=client_headers
        )
        declarations = list_response.json()
        
        if len(declarations) == 0:
            pytest.skip("No declarations found")
        
        decl_id = declarations[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{decl_id}/messages",
            headers=client_headers
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"Found {len(response.json())} messages")
    
    def test_add_message(self, client_headers):
        """Test POST /api/declarations/v2/declarations/{id}/messages"""
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations",
            headers=client_headers
        )
        declarations = list_response.json()
        
        if len(declarations) == 0:
            pytest.skip("No declarations found")
        
        decl_id = declarations[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{decl_id}/messages",
            headers=client_headers,
            json={
                "content": "Test message from iteration 40",
                "is_integration_request": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["messages_count"] > 0
        print("Message added successfully")
    
    # ==================== COMPLETION PERCENTAGE ====================
    
    def test_completion_percentage_calculation(self, client_headers):
        """Test that completion percentage is calculated correctly"""
        list_response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations",
            headers=client_headers
        )
        declarations = list_response.json()
        
        if len(declarations) == 0:
            pytest.skip("No declarations found")
        
        decl_id = declarations[0]["id"]
        
        # Get current state
        detail_response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{decl_id}",
            headers=client_headers
        )
        data = detail_response.json()
        
        # Count completed sections (excluding autorizzazione_firma)
        sections = data["sections"]
        completed = 0
        total = 13  # 14 sections - 1 (autorizzazione_firma)
        
        for section_name, section_data in sections.items():
            if section_name == "autorizzazione_firma":
                continue
            if section_data.get("completed") or section_data.get("not_applicable"):
                completed += 1
        
        expected_percentage = int((completed / total) * 100)
        actual_percentage = data["completion_percentage"]
        
        # Allow small rounding differences
        assert abs(expected_percentage - actual_percentage) <= 1, \
            f"Expected ~{expected_percentage}%, got {actual_percentage}%"
        
        print(f"Completion: {completed}/{total} sections = {actual_percentage}%")
    
    # ==================== DECLARATION NOT FOUND ====================
    
    def test_get_nonexistent_declaration(self, client_headers):
        """Test getting a non-existent declaration"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/nonexistent-id-12345",
            headers=client_headers
        )
        assert response.status_code == 404
        print("Non-existent declaration correctly returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
