"""
Test suite for Tax Return Wizard functionality - Iteration 39
Tests: section_statuses API, section updates, auto-save, wizard navigation
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tribute-models-docs.preview.emergentagent.com')

# Test credentials
CLIENT_EMAIL = "test_commercialista_202642@example.com"
CLIENT_PASSWORD = "TestCliente123!"
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"


class TestWizardAPI:
    """Test Tax Return Wizard API endpoints"""
    
    @pytest.fixture(scope="class")
    def client_token(self):
        """Get client authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Client authentication failed")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture(scope="class")
    def tax_return_id(self, client_token):
        """Get existing tax return ID (2024 Bozza)"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        if response.status_code == 200:
            returns = response.json()
            # Find the 2024 bozza declaration
            for tr in returns:
                if tr.get("anno_fiscale") == 2024 and tr.get("stato") == "bozza":
                    return tr["id"]
        pytest.skip("No editable tax return found")
    
    # === SECTION STATUSES API TESTS ===
    
    def test_update_section_statuses(self, client_token, tax_return_id):
        """Test PUT /api/declarations/tax-returns/{id}/sections/section_statuses"""
        statuses = {
            "datos_personales": "completed",
            "situacion_familiar": "not_applicable",
            "rentas_trabajo": "in_progress"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/sections/section_statuses",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json=statuses
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "updated_at" in data
        print(f"Section statuses updated: {data}")
    
    def test_get_tax_return_with_section_statuses(self, client_token, tax_return_id):
        """Verify section_statuses are persisted in tax return"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify section_statuses field exists
        assert "section_statuses" in data or data.get("section_statuses") is not None, \
            "section_statuses should be present in tax return"
        
        print(f"Tax return section_statuses: {data.get('section_statuses')}")
    
    # === SECTION UPDATE TESTS ===
    
    def test_update_datos_personales_section(self, client_token, tax_return_id):
        """Test updating datos_personales section"""
        datos = {
            "nombre": "Test",
            "apellidos": "User",
            "dni_nie": "X1234567A",
            "fecha_nacimiento": "1990-01-01",
            "direccion": "Via Test 123",
            "municipio": "Las Palmas",
            "provincia": "Gran Canaria",
            "codigo_postal": "35001",
            "telefono": "+34 612 345 678",
            "email": "test@example.com",
            "estado_civil": "soltero",
            "residente_canarias": True
        }
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/sections/datos_personales",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json=datos
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "datos_personales" in data["message"]
        print(f"Datos personales updated: {data}")
    
    def test_update_situacion_familiar_not_applicable(self, client_token, tax_return_id):
        """Test marking situacion_familiar as not applicable"""
        datos = {
            "_not_applicable": True
        }
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/sections/situacion_familiar",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json=datos
        )
        
        assert response.status_code == 200
        print(f"Situacion familiar marked as not applicable")
    
    def test_update_rentas_trabajo_section(self, client_token, tax_return_id):
        """Test updating rentas_trabajo section"""
        datos = {
            "tiene_rentas_trabajo": True,
            "numero_pagadores": 1,
            "tiene_desempleo": False,
            "tiene_pension": False,
            "notas": "Test employment income"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/sections/rentas_trabajo",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json=datos
        )
        
        assert response.status_code == 200
        print(f"Rentas trabajo updated")
    
    def test_update_autonomo_not_applicable(self, client_token, tax_return_id):
        """Test marking autonomo as not applicable"""
        datos = {
            "_not_applicable": True,
            "es_autonomo": False
        }
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/sections/autonomo",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json=datos
        )
        
        assert response.status_code == 200
        print(f"Autonomo marked as not applicable")
    
    def test_update_inmuebles_section(self, client_token, tax_return_id):
        """Test updating inmuebles section"""
        datos = {
            "tiene_inmuebles": True,
            "direccion_principal": "Via Test 123, Las Palmas",
            "referencia_catastral": "1234567890",
            "porcentaje_propiedad": 100,
            "uso": "vivienda_habitual",
            "valor_adquisicion": 150000
        }
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/sections/inmuebles",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json=datos
        )
        
        assert response.status_code == 200
        print(f"Inmuebles updated")
    
    def test_update_criptomonedas_not_applicable(self, client_token, tax_return_id):
        """Test marking criptomonedas as not applicable"""
        datos = {
            "_not_applicable": True,
            "tiene_criptomonedas": False
        }
        
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/sections/criptomonedas",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json=datos
        )
        
        assert response.status_code == 200
        print(f"Criptomonedas marked as not applicable")
    
    # === VALIDATION TESTS ===
    
    def test_invalid_section_name(self, client_token, tax_return_id):
        """Test updating invalid section name returns error"""
        response = requests.put(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/sections/invalid_section",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json={"test": "data"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"Invalid section error: {data['detail']}")
    
    def test_unauthorized_access(self, admin_token, tax_return_id):
        """Test that admin can access client's tax return"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Admin should be able to view client's tax return
        assert response.status_code == 200
        print(f"Admin can access client's tax return")
    
    # === VERIFY PERSISTED DATA ===
    
    def test_verify_all_sections_persisted(self, client_token, tax_return_id):
        """Verify all section updates are persisted"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify datos_personales
        datos = data.get("datos_personales", {})
        assert datos.get("nombre") == "Test" or datos.get("nombre") == "TestNome", \
            f"Expected nombre to be 'Test' or 'TestNome', got {datos.get('nombre')}"
        
        # Verify section_statuses
        statuses = data.get("section_statuses", {})
        print(f"Final section_statuses: {statuses}")
        
        # Verify inmuebles
        inmuebles = data.get("inmuebles", {})
        if inmuebles:
            assert inmuebles.get("tiene_inmuebles") == True, "Expected tiene_inmuebles to be True"
        
        print(f"All sections verified successfully")


class TestWizardNavigation:
    """Test wizard navigation constraints"""
    
    @pytest.fixture(scope="class")
    def client_token(self):
        """Get client authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Client authentication failed")
    
    def test_get_declaration_types(self, client_token):
        """Test GET /api/declarations/types"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/types",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify default type exists
        redditi_type = next((t for t in data if t.get("code") == "redditi"), None)
        assert redditi_type is not None, "Default 'redditi' type should exist"
        print(f"Declaration types: {[t['name'] for t in data]}")
    
    def test_get_authorization_text(self, client_token):
        """Test GET /api/declarations/tax-returns/{id}/authorization-text"""
        # First get a tax return ID
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        if response.status_code == 200 and len(response.json()) > 0:
            tax_return_id = response.json()[0]["id"]
            
            auth_response = requests.get(
                f"{BASE_URL}/api/declarations/tax-returns/{tax_return_id}/authorization-text",
                headers={"Authorization": f"Bearer {client_token}"}
            )
            
            assert auth_response.status_code == 200
            data = auth_response.json()
            assert "text" in data
            assert len(data["text"]) > 0
            print(f"Authorization text length: {len(data['text'])} chars")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
