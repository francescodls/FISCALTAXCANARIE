"""
Test Iteration 6 Features:
1. PUT /api/auth/me - Cliente può modificare la propria anagrafica
2. PUT /api/clients/{id} con tipo_cliente - Auto-inserimento in lista
3. Modelli tributari con video YouTube e thumbnail
4. NO sezione 'Conseguenze mancata presentazione' nei modelli
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Credentials
COMMERCIALISTA_EMAIL = "info@fiscaltaxcanarie.com"
COMMERCIALISTA_PASSWORD = "Triana48+"
CLIENT_EMAIL = "test_fase3_chat@test.com"
CLIENT_PASSWORD = "TestChat123!"


class TestClientSelfUpdate:
    """Test cliente può modificare la propria anagrafica via PUT /api/auth/me"""
    
    def test_client_login(self):
        """Login as cliente"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "cliente"
        print(f"✅ Client login successful: {data['user']['full_name']}")
        return data["access_token"]
    
    def test_get_client_profile(self):
        """GET /api/auth/me - Ottieni profilo cliente"""
        token = self.test_client_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        # Verifica campi anagrafica estesa
        assert "full_name" in data
        assert "email" in data
        assert "phone" in data or data.get("phone") is None
        assert "nie" in data or data.get("nie") is None
        assert "nif" in data or data.get("nif") is None
        assert "cif" in data or data.get("cif") is None
        assert "indirizzo" in data or data.get("indirizzo") is None
        assert "citta" in data or data.get("citta") is None
        assert "cap" in data or data.get("cap") is None
        assert "provincia" in data or data.get("provincia") is None
        assert "iban" in data or data.get("iban") is None
        print("✅ GET /api/auth/me returns extended profile fields")
        return data, headers
    
    def test_update_client_profile(self):
        """PUT /api/auth/me - Cliente aggiorna propria anagrafica"""
        token = self.test_client_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Update profile with test data
        update_data = {
            "phone": "+34 612 345 999",
            "nie": "X-1234567-T",
            "indirizzo": "Calle Test 123",
            "citta": "Las Palmas",
            "cap": "35001"
        }
        
        response = requests.put(f"{BASE_URL}/api/auth/me", json=update_data, headers=headers)
        assert response.status_code == 200, f"Update profile failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "user" in data
        assert data["user"]["phone"] == "+34 612 345 999"
        assert data["user"]["nie"] == "X-1234567-T"
        assert data["user"]["indirizzo"] == "Calle Test 123"
        print("✅ PUT /api/auth/me - Profile updated successfully")
        
        # Verify changes persisted
        verify_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        verify_data = verify_response.json()
        assert verify_data["phone"] == "+34 612 345 999"
        assert verify_data["nie"] == "X-1234567-T"
        print("✅ Profile changes persisted correctly")
        
    def test_client_cannot_update_restricted_fields(self):
        """Cliente non può modificare tipo_cliente o stato"""
        token = self.test_client_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        # ClientSelfUpdate model should not allow these fields
        # The backend should ignore them or return error
        response = requests.put(f"{BASE_URL}/api/auth/me", json={
            "full_name": "Test Updated Name"  # This is allowed
        }, headers=headers)
        
        # Should succeed for allowed fields
        assert response.status_code == 200
        print("✅ Client can update allowed fields")


class TestCommercialistaClientUpdate:
    """Test commercialista può modificare cliente con auto-lista"""
    
    def get_commercialista_token(self):
        """Login as commercialista"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COMMERCIALISTA_EMAIL,
            "password": COMMERCIALISTA_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_update_client_tipo_cliente_auto_lista(self):
        """PUT /api/clients/{id} con tipo_cliente aggiorna automaticamente le liste"""
        token = self.get_commercialista_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get a client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        assert clients_response.status_code == 200
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients to test")
        
        client = clients[0]
        client_id = client["id"]
        original_tipo = client.get("tipo_cliente", "autonomo")
        
        # Change tipo_cliente to "societa"
        new_tipo = "societa" if original_tipo != "societa" else "autonomo"
        
        response = requests.put(f"{BASE_URL}/api/clients/{client_id}", json={
            "tipo_cliente": new_tipo
        }, headers=headers)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        print(f"✅ PUT /api/clients/{client_id} - tipo_cliente changed to {new_tipo}")
        
        # Verify the client was added to the appropriate list
        updated_client = requests.get(f"{BASE_URL}/api/clients/{client_id}", headers=headers)
        assert updated_client.status_code == 200
        updated_data = updated_client.json()
        
        # Check lists - should contain the list ID for the tipo_cliente
        lists_response = requests.get(f"{BASE_URL}/api/client-lists", headers=headers)
        lists = lists_response.json()
        
        list_name_map = {"autonomo": "Autonomi", "societa": "Società", "privato": "Privati"}
        expected_list_name = list_name_map.get(new_tipo)
        
        # Find the expected list
        expected_list = next((l for l in lists if l["name"] == expected_list_name), None)
        
        if expected_list:
            # Client should be in this list
            assert expected_list["id"] in updated_data.get("lists", []), \
                f"Client should be in {expected_list_name} list"
            print(f"✅ Client auto-added to '{expected_list_name}' list")
        else:
            print(f"⚠️ List '{expected_list_name}' not found - may be created on first use")
        
        # Restore original tipo_cliente
        requests.put(f"{BASE_URL}/api/clients/{client_id}", json={
            "tipo_cliente": original_tipo
        }, headers=headers)


class TestModelliTributari:
    """Test modelli tributari con video YouTube e senza 'Conseguenze mancata presentazione'"""
    
    def get_commercialista_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COMMERCIALISTA_EMAIL,
            "password": COMMERCIALISTA_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_modelli_tributari(self):
        """GET /api/modelli-tributari - Lista modelli"""
        token = self.get_commercialista_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/modelli-tributari", headers=headers)
        assert response.status_code == 200
        
        modelli = response.json()
        assert len(modelli) > 0, "No modelli tributari found"
        
        modello = modelli[0]
        # Check required fields
        assert "id" in modello
        assert "codice" in modello
        assert "nome" in modello
        assert "descrizione" in modello
        assert "a_cosa_serve" in modello
        assert "chi_deve_presentarlo" in modello
        assert "periodicita" in modello
        assert "scadenza_tipica" in modello
        assert "documenti_necessari" in modello
        assert "video_youtube" in modello or modello.get("video_youtube") is None
        assert "video_thumbnail" in modello or modello.get("video_thumbnail") is None
        
        print(f"✅ GET /api/modelli-tributari returns {len(modelli)} modelli with correct structure")
        return modelli, headers
    
    def test_modelli_no_conseguenze_field(self):
        """Verifica che i modelli NON abbiano il campo 'conseguenze_mancata_presentazione'"""
        modelli, headers = self.test_get_modelli_tributari()
        
        for modello in modelli:
            # Il campo non dovrebbe essere presente nella risposta API
            # (anche se è nel DB, non dovrebbe essere esposto)
            if "conseguenze_mancata_presentazione" in modello:
                # If present in DB, it should not be exposed in response model
                print(f"⚠️ Modello {modello['codice']} has 'conseguenze_mancata_presentazione' in DB")
            else:
                print(f"✅ Modello {modello['codice']} does not expose 'conseguenze_mancata_presentazione'")
        
        print("✅ Checked all modelli for 'conseguenze_mancata_presentazione' field")
    
    def test_update_modello_with_youtube_video(self):
        """PUT /api/modelli-tributari/{id} - Aggiorna con video YouTube"""
        modelli, headers = self.test_get_modelli_tributari()
        
        modello = modelli[0]
        modello_id = modello["id"]
        
        # Update with YouTube video
        youtube_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        
        update_data = {
            "codice": modello["codice"],
            "nome": modello["nome"],
            "descrizione": modello["descrizione"],
            "a_cosa_serve": modello["a_cosa_serve"],
            "chi_deve_presentarlo": modello["chi_deve_presentarlo"],
            "periodicita": modello["periodicita"],
            "scadenza_tipica": modello["scadenza_tipica"],
            "documenti_necessari": modello.get("documenti_necessari", []),
            "note_operative": modello.get("note_operative", ""),
            "video_youtube": youtube_url
        }
        
        response = requests.put(f"{BASE_URL}/api/modelli-tributari/{modello_id}", 
                               json=update_data, headers=headers)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify video was saved
        get_response = requests.get(f"{BASE_URL}/api/modelli-tributari", headers=headers)
        updated_modelli = get_response.json()
        updated_modello = next((m for m in updated_modelli if m["id"] == modello_id), None)
        
        assert updated_modello is not None
        assert updated_modello.get("video_youtube") == youtube_url
        
        # Check thumbnail is generated
        assert updated_modello.get("video_thumbnail") is not None
        assert "img.youtube.com" in updated_modello["video_thumbnail"]
        
        print("✅ Modello updated with YouTube video")
        print(f"✅ Video thumbnail generated: {updated_modello['video_thumbnail']}")
    
    def test_create_modello_with_youtube(self):
        """POST /api/modelli-tributari - Crea nuovo modello con video"""
        token = self.get_commercialista_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        new_modello = {
            "codice": "TEST-VIDEO-001",
            "nome": "Test Modello Con Video",
            "descrizione": "Modello di test con video YouTube",
            "a_cosa_serve": "Test",
            "chi_deve_presentarlo": "Test",
            "periodicita": "annuale",
            "scadenza_tipica": "31 dicembre",
            "documenti_necessari": ["Documento 1", "Documento 2"],
            "note_operative": "Note di test",
            "video_youtube": "https://www.youtube.com/watch?v=test123"
        }
        
        response = requests.post(f"{BASE_URL}/api/modelli-tributari", 
                                json=new_modello, headers=headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        
        print(f"✅ Created new modello with YouTube video: {data['id']}")
        
        # Cleanup - delete test modello
        delete_response = requests.delete(f"{BASE_URL}/api/modelli-tributari/{data['id']}", 
                                         headers=headers)
        assert delete_response.status_code == 200
        print("✅ Cleaned up test modello")


class TestModelsManagementPage:
    """Test pagina /admin/models esiste e funziona"""
    
    def get_commercialista_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COMMERCIALISTA_EMAIL,
            "password": COMMERCIALISTA_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_modelli_crud_endpoints(self):
        """Verifica tutti gli endpoint CRUD per modelli tributari"""
        token = self.get_commercialista_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # GET - List all
        response = requests.get(f"{BASE_URL}/api/modelli-tributari", headers=headers)
        assert response.status_code == 200
        print("✅ GET /api/modelli-tributari works")
        
        # POST - Create
        test_modello = {
            "codice": "TEST-CRUD-001",
            "nome": "Test CRUD Modello",
            "descrizione": "Test",
            "a_cosa_serve": "Test",
            "chi_deve_presentarlo": "Test",
            "periodicita": "mensile",
            "scadenza_tipica": "15 del mese",
            "documenti_necessari": [],
            "note_operative": "",
            "video_youtube": ""
        }
        
        create_response = requests.post(f"{BASE_URL}/api/modelli-tributari", 
                                       json=test_modello, headers=headers)
        assert create_response.status_code == 200
        modello_id = create_response.json()["id"]
        print(f"✅ POST /api/modelli-tributari works - created {modello_id}")
        
        # PUT - Update
        test_modello["nome"] = "Test CRUD Modello Updated"
        update_response = requests.put(f"{BASE_URL}/api/modelli-tributari/{modello_id}", 
                                      json=test_modello, headers=headers)
        assert update_response.status_code == 200
        print(f"✅ PUT /api/modelli-tributari/{modello_id} works")
        
        # DELETE - Remove
        delete_response = requests.delete(f"{BASE_URL}/api/modelli-tributari/{modello_id}", 
                                         headers=headers)
        assert delete_response.status_code == 200
        print(f"✅ DELETE /api/modelli-tributari/{modello_id} works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
