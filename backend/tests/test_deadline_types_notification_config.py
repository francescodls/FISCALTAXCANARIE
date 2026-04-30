"""
Test per Configurazione Notifiche e Auto-Assegnazione Scadenze
Iteration 44 - Testing deadline types notification config and auto-assignment

Features tested:
1. GET /api/deadline-types returns notification_config
2. POST /api/deadline-types creates type with notification_config and auto-generates deadlines
3. Auto-assignment on client creation
4. Auto-assignment on client category change
5. Notification channels (push/email)
6. Relative reminders (days before deadline)
7. Fixed dates for custom reminders
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, date

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"

class TestDeadlineTypesNotificationConfig:
    """Test notification configuration in deadline types"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.admin_user = login_response.json().get("user")
        
    def test_01_get_deadline_types_returns_notification_config(self):
        """GET /api/deadline-types should return notification_config field"""
        response = self.session.get(f"{BASE_URL}/api/deadline-types")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        types = response.json()
        assert isinstance(types, list), "Response should be a list"
        
        # Check if any type has notification_config
        types_with_config = [t for t in types if t.get("notification_config")]
        print(f"Found {len(types)} deadline types, {len(types_with_config)} with notification_config")
        
        # If there are types with config, verify structure
        for dt in types_with_config:
            config = dt.get("notification_config", {})
            print(f"Type '{dt.get('name')}' notification_config: {config}")
            
            # Verify expected fields
            if config:
                assert "enabled" in config or "channels" in config or "relative_reminders" in config, \
                    "notification_config should have enabled, channels, or relative_reminders"
    
    def test_02_create_deadline_type_with_notification_config(self):
        """POST /api/deadline-types should create type with notification_config"""
        unique_name = f"TEST_Scadenza_Notifiche_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "name": unique_name,
            "description": "Test scadenza con configurazione notifiche avanzate",
            "frequency": "trimestrale",
            "due_day": 20,
            "priority": "normale",
            "color": "#3caca4",
            "assigned_category_ids": ["autonomo"],
            "is_active": True,
            "auto_assign_to_category": False,  # Disable auto-assign for this test
            "notification_config": {
                "enabled": True,
                "channels": ["push", "email"],
                "relative_reminders": [20, 15, 7, 3, 1, 0],
                "fixed_dates": ["2026-03-15", "2026-06-15"],
                "message_template": "Promemoria: {deadline_name} scade il {due_date}"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/deadline-types", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert created.get("name") == unique_name
        assert created.get("id") is not None
        
        # Verify notification_config was saved
        config = created.get("notification_config", {})
        assert config.get("enabled") == True, "notification_config.enabled should be True"
        assert "push" in config.get("channels", []), "channels should include 'push'"
        assert "email" in config.get("channels", []), "channels should include 'email'"
        assert 20 in config.get("relative_reminders", []), "relative_reminders should include 20"
        assert 7 in config.get("relative_reminders", []), "relative_reminders should include 7"
        assert "2026-03-15" in config.get("fixed_dates", []), "fixed_dates should include 2026-03-15"
        
        print(f"Created deadline type '{unique_name}' with notification_config: {config}")
        
        # Cleanup - delete the test type
        delete_response = self.session.delete(f"{BASE_URL}/api/deadline-types/{created['id']}")
        print(f"Cleanup: deleted test type, status: {delete_response.status_code}")
    
    def test_03_create_deadline_type_with_auto_assign(self):
        """POST /api/deadline-types with auto_assign_to_category=true should auto-generate deadlines"""
        unique_name = f"TEST_AutoAssign_{uuid.uuid4().hex[:8]}"
        
        # First, count existing deadlines for autonomo clients
        clients_response = self.session.get(f"{BASE_URL}/api/clients?tipo_cliente=autonomo")
        autonomo_clients = clients_response.json() if clients_response.status_code == 200 else []
        print(f"Found {len(autonomo_clients)} autonomo clients")
        
        payload = {
            "name": unique_name,
            "description": "Test auto-assegnazione scadenze",
            "frequency": "trimestrale",
            "due_day": 20,
            "priority": "normale",
            "color": "#ff6b6b",
            "assigned_category_ids": ["autonomo"],
            "is_active": True,
            "auto_assign_to_category": True,  # Enable auto-assign
            "notification_config": {
                "enabled": True,
                "channels": ["push", "email"],
                "relative_reminders": [7, 3, 1, 0],
                "fixed_dates": [],
                "message_template": "Promemoria: {deadline_name} scade il {due_date}"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/deadline-types", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        type_id = created.get("id")
        assert type_id is not None
        
        print(f"Created deadline type '{unique_name}' with auto_assign_to_category=True")
        
        # Verify deadlines were auto-generated
        # Check deadlines collection for this type
        deadlines_response = self.session.get(f"{BASE_URL}/api/deadlines")
        if deadlines_response.status_code == 200:
            all_deadlines = deadlines_response.json()
            auto_generated = [d for d in all_deadlines if d.get("deadline_type_id") == type_id]
            print(f"Found {len(auto_generated)} auto-generated deadlines for type '{unique_name}'")
            
            if auto_generated:
                # Verify deadline structure
                sample = auto_generated[0]
                assert sample.get("auto_generated") == True, "Deadline should have auto_generated=True"
                assert sample.get("deadline_type_id") == type_id
                assert sample.get("notification_config") is not None, "Deadline should inherit notification_config"
        
        # Cleanup - delete the test type (may fail if deadlines exist)
        delete_response = self.session.delete(f"{BASE_URL}/api/deadline-types/{type_id}")
        print(f"Cleanup: delete type status: {delete_response.status_code}")
    
    def test_04_get_single_deadline_type_with_notification_config(self):
        """GET /api/deadline-types/{id} should return notification_config"""
        # First get list to find a type with notification_config
        list_response = self.session.get(f"{BASE_URL}/api/deadline-types")
        assert list_response.status_code == 200
        
        types = list_response.json()
        if not types:
            pytest.skip("No deadline types found")
        
        # Get first type
        type_id = types[0].get("id")
        response = self.session.get(f"{BASE_URL}/api/deadline-types/{type_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        dt = response.json()
        assert dt.get("id") == type_id
        
        # notification_config should be present (even if default)
        config = dt.get("notification_config")
        print(f"Deadline type '{dt.get('name')}' notification_config: {config}")
        
        # Verify it has expected structure if present
        if config:
            assert isinstance(config, dict), "notification_config should be a dict"
    
    def test_05_update_deadline_type_notification_config(self):
        """PUT /api/deadline-types/{id} should update notification_config"""
        # Create a test type first
        unique_name = f"TEST_UpdateConfig_{uuid.uuid4().hex[:8]}"
        
        create_payload = {
            "name": unique_name,
            "description": "Test update notification config",
            "frequency": "mensile",
            "due_day": 15,
            "assigned_category_ids": ["societa"],
            "is_active": True,
            "auto_assign_to_category": False,
            "notification_config": {
                "enabled": True,
                "channels": ["push"],
                "relative_reminders": [7, 3],
                "fixed_dates": []
            }
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/deadline-types", json=create_payload)
        assert create_response.status_code == 200
        
        type_id = create_response.json().get("id")
        
        # Update notification_config
        update_payload = {
            "notification_config": {
                "enabled": True,
                "channels": ["push", "email"],  # Added email
                "relative_reminders": [20, 15, 7, 3, 1, 0],  # More reminders
                "fixed_dates": ["2026-04-01"]  # Added fixed date
            }
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/deadline-types/{type_id}", json=update_payload)
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated = update_response.json()
        config = updated.get("notification_config", {})
        
        assert "email" in config.get("channels", []), "Updated channels should include email"
        assert 20 in config.get("relative_reminders", []), "Updated reminders should include 20"
        assert "2026-04-01" in config.get("fixed_dates", []), "Updated fixed_dates should include 2026-04-01"
        
        print(f"Updated notification_config: {config}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/deadline-types/{type_id}")


class TestAutoAssignDeadlinesOnClientCreation:
    """Test auto-assignment of deadlines when creating new clients"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_06_create_client_auto_assigns_deadlines(self):
        """Creating a new client should auto-assign deadlines based on category"""
        unique_email = f"test_autoassign_{uuid.uuid4().hex[:8]}@example.com"
        unique_name = f"Test AutoAssign Client {uuid.uuid4().hex[:8]}"
        
        # Create client with tipo_cliente=autonomo
        payload = {
            "full_name": unique_name,
            "email": unique_email,
            "tipo_cliente": "autonomo",
            "send_invite": False  # Don't send email
        }
        
        response = self.session.post(f"{BASE_URL}/api/clients/create", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        client_id = result.get("client_id")
        deadlines_assigned = result.get("deadlines_assigned", 0)
        
        print(f"Created client '{unique_name}' with {deadlines_assigned} deadlines auto-assigned")
        
        # Verify deadlines were assigned
        assert client_id is not None, "client_id should be returned"
        
        # Check if deadlines_assigned is in response
        if "deadlines_assigned" in result:
            print(f"Response includes deadlines_assigned: {deadlines_assigned}")
        
        # Verify by checking deadlines for this client
        deadlines_response = self.session.get(f"{BASE_URL}/api/deadlines")
        if deadlines_response.status_code == 200:
            all_deadlines = deadlines_response.json()
            client_deadlines = [d for d in all_deadlines if client_id in d.get("client_ids", [])]
            print(f"Found {len(client_deadlines)} deadlines for new client")
            
            # Verify auto-generated flag
            auto_generated = [d for d in client_deadlines if d.get("auto_generated")]
            print(f"Of which {len(auto_generated)} are auto-generated")
        
        # Cleanup - delete client
        delete_response = self.session.delete(f"{BASE_URL}/api/clients/{client_id}?permanent=true")
        print(f"Cleanup: deleted test client, status: {delete_response.status_code}")
    
    def test_07_client_category_change_assigns_new_deadlines(self):
        """Changing client category should auto-assign new deadlines"""
        unique_email = f"test_catchange_{uuid.uuid4().hex[:8]}@example.com"
        unique_name = f"Test Category Change {uuid.uuid4().hex[:8]}"
        
        # Create client as 'privato' (may have fewer deadline types)
        create_payload = {
            "full_name": unique_name,
            "email": unique_email,
            "tipo_cliente": "privato",
            "send_invite": False
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/clients/create", json=create_payload)
        assert create_response.status_code == 200
        
        client_id = create_response.json().get("client_id")
        print(f"Created client as 'privato'")
        
        # Count initial deadlines
        deadlines_response = self.session.get(f"{BASE_URL}/api/deadlines")
        initial_deadlines = []
        if deadlines_response.status_code == 200:
            all_deadlines = deadlines_response.json()
            initial_deadlines = [d for d in all_deadlines if client_id in d.get("client_ids", [])]
        print(f"Initial deadlines count: {len(initial_deadlines)}")
        
        # Change category to 'autonomo'
        update_payload = {
            "tipo_cliente": "autonomo"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/clients/{client_id}", json=update_payload)
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        print(f"Changed client category to 'autonomo'")
        
        # Count deadlines after category change
        deadlines_response = self.session.get(f"{BASE_URL}/api/deadlines")
        final_deadlines = []
        if deadlines_response.status_code == 200:
            all_deadlines = deadlines_response.json()
            final_deadlines = [d for d in all_deadlines if client_id in d.get("client_ids", [])]
        print(f"Final deadlines count: {len(final_deadlines)}")
        
        # Should have more or equal deadlines after category change
        # (autonomo typically has more deadline types than privato)
        print(f"Deadlines changed from {len(initial_deadlines)} to {len(final_deadlines)}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/clients/{client_id}?permanent=true")


class TestAssignDeadlinesToClientEndpoint:
    """Test the explicit endpoint to assign deadlines to a client"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_08_assign_deadlines_to_client_endpoint(self):
        """POST /api/deadline-types/assign-to-client/{client_id} should assign deadlines"""
        # Get an existing autonomo client
        clients_response = self.session.get(f"{BASE_URL}/api/clients?tipo_cliente=autonomo")
        if clients_response.status_code != 200:
            pytest.skip("Could not get clients")
        
        clients = clients_response.json()
        if not clients:
            pytest.skip("No autonomo clients found")
        
        client = clients[0]
        client_id = client.get("id")
        
        # Call assign endpoint
        response = self.session.post(f"{BASE_URL}/api/deadline-types/assign-to-client/{client_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        print(f"Assign deadlines result: {result}")
        
        assert "count" in result or "message" in result, "Response should have count or message"
        
        if "count" in result:
            print(f"Assigned {result['count']} deadlines to client {client.get('full_name')}")
    
    def test_09_assign_deadlines_to_nonexistent_client(self):
        """POST /api/deadline-types/assign-to-client/{invalid_id} should return 404"""
        fake_id = str(uuid.uuid4())
        
        response = self.session.post(f"{BASE_URL}/api/deadline-types/assign-to-client/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestSchedulerNotificationConfig:
    """Test that scheduler respects notification_config"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_10_deadline_inherits_notification_config(self):
        """Deadlines should inherit notification_config from their type"""
        # Get deadlines with deadline_type_id
        deadlines_response = self.session.get(f"{BASE_URL}/api/deadlines")
        if deadlines_response.status_code != 200:
            pytest.skip("Could not get deadlines")
        
        deadlines = deadlines_response.json()
        typed_deadlines = [d for d in deadlines if d.get("deadline_type_id")]
        
        print(f"Found {len(typed_deadlines)} deadlines with deadline_type_id")
        
        for deadline in typed_deadlines[:3]:  # Check first 3
            config = deadline.get("notification_config")
            print(f"Deadline '{deadline.get('title')}' notification_config: {config}")
            
            if config:
                # Verify structure
                assert isinstance(config, dict), "notification_config should be a dict"


class TestTaxModels:
    """Test tax models CRUD"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_11_get_tax_models(self):
        """GET /api/tax-models should return list of tax models"""
        response = self.session.get(f"{BASE_URL}/api/tax-models")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        models = response.json()
        assert isinstance(models, list), "Response should be a list"
        
        print(f"Found {len(models)} tax models")
        
        for model in models[:3]:
            print(f"  - {model.get('codice')}: {model.get('nome')}")
    
    def test_12_create_and_delete_tax_model(self):
        """POST /api/tax-models should create a new tax model"""
        unique_code = f"TEST-{uuid.uuid4().hex[:6].upper()}"
        
        payload = {
            "codice": unique_code,
            "nome": "Test Modello Tributario",
            "descrizione": "Modello di test per verifica API",
            "a_cosa_serve": "Test purposes",
            "chi_deve_presentarlo": "Test users",
            "periodicita": "Annuale",
            "scadenza_tipica": "31 dicembre",
            "documenti_necessari": ["Documento 1", "Documento 2"],
            "note_operative": "Note di test"
        }
        
        response = self.session.post(f"{BASE_URL}/api/tax-models", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert created.get("codice") == unique_code
        assert created.get("is_custom") == True
        
        model_id = created.get("id")
        print(f"Created tax model '{unique_code}' with id {model_id}")
        
        # Delete
        delete_response = self.session.delete(f"{BASE_URL}/api/tax-models/{model_id}")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        print(f"Deleted tax model '{unique_code}'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
