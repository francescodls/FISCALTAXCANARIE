"""
Test suite per verificare il funzionamento dopo il refactoring del backend.
Verifica che i router modulari (tickets, fees) funzionino correttamente.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://app.fiscaltaxcanarie.com')

# Test credentials
ADMIN_EMAIL = "info@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Triana48+"


class TestAuthAndLogin:
    """Test autenticazione admin"""
    
    def test_admin_login_success(self):
        """Test login admin con credenziali corrette"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "commercialista"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful: {data['user']['full_name']}")
    
    def test_admin_login_wrong_password(self):
        """Test login con password errata"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✓ Wrong password correctly rejected")


@pytest.fixture(scope="module")
def admin_token():
    """Ottiene token admin per i test"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip("Admin login failed")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers con token admin"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestClientsAPI:
    """Test API clienti"""
    
    def test_get_clients_list(self, admin_headers):
        """Test recupero lista clienti"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Clients list retrieved: {len(data)} clients")


class TestDeclarationsAPI:
    """Test API dichiarazioni (modulo declarations)"""
    
    def test_get_declaration_types(self, admin_headers):
        """Test recupero tipi dichiarazione"""
        response = requests.get(f"{BASE_URL}/api/declarations/types", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Declaration types retrieved: {len(data)} types")
    
    def test_get_tax_returns(self, admin_headers):
        """Test recupero pratiche dichiarazioni"""
        response = requests.get(f"{BASE_URL}/api/declarations/tax-returns", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Tax returns retrieved: {len(data)} returns")
    
    def test_get_tax_returns_with_filters(self, admin_headers):
        """Test recupero pratiche con filtri"""
        response = requests.get(
            f"{BASE_URL}/api/declarations/tax-returns?anno_fiscale=2025",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Tax returns filtered by year: {len(data)} returns")


class TestTicketsAPI:
    """Test API tickets (router modulare /routes/tickets.py)"""
    
    def test_get_tickets_list(self, admin_headers):
        """Test recupero lista ticket - verifica router modulare"""
        response = requests.get(f"{BASE_URL}/api/tickets", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Tickets list retrieved: {len(data)} tickets")
    
    def test_get_tickets_with_status_filter(self, admin_headers):
        """Test recupero ticket con filtro stato"""
        response = requests.get(
            f"{BASE_URL}/api/tickets?status=aperto",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Open tickets retrieved: {len(data)} tickets")
    
    def test_get_ticket_notifications(self, admin_headers):
        """Test recupero notifiche ticket admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/ticket-notifications",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Ticket notifications retrieved: {len(data)} notifications")


class TestFeesAPI:
    """Test API onorari (router modulare /routes/fees_routes.py)"""
    
    def test_get_all_fees(self, admin_headers):
        """Test recupero tutti gli onorari - verifica router modulare"""
        response = requests.get(f"{BASE_URL}/api/fees/all", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ All fees retrieved: {len(data)} fees")
    
    def test_get_fees_summary(self, admin_headers):
        """Test recupero riepilogo onorari"""
        response = requests.get(f"{BASE_URL}/api/fees/summary", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_pending" in data
        assert "total_paid" in data
        assert "total_count" in data
        print(f"✓ Fees summary: {data['total_count']} total, €{data['total_pending']} pending")
    
    def test_get_fees_by_client(self, admin_headers):
        """Test recupero onorari raggruppati per cliente"""
        response = requests.get(f"{BASE_URL}/api/fees/by-client", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fees by client retrieved: {len(data)} clients")
    
    def test_get_fees_with_filters(self, admin_headers):
        """Test recupero onorari con filtri"""
        response = requests.get(
            f"{BASE_URL}/api/fees/all?status=pending",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Pending fees retrieved: {len(data)} fees")


class TestDeadlinesAPI:
    """Test API scadenze"""
    
    def test_get_deadlines(self, admin_headers):
        """Test recupero scadenze"""
        response = requests.get(f"{BASE_URL}/api/deadlines", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Deadlines retrieved: {len(data)} deadlines")


class TestDocumentsAPI:
    """Test API documenti"""
    
    def test_get_documents(self, admin_headers):
        """Test recupero documenti"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Documents retrieved: {len(data)} documents")


class TestFolderCategoriesAPI:
    """Test API categorie cartelle"""
    
    def test_get_folder_categories(self, admin_headers):
        """Test recupero categorie cartelle"""
        response = requests.get(f"{BASE_URL}/api/folder-categories", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0  # Dovrebbero esserci le categorie predefinite
        print(f"✓ Folder categories retrieved: {len(data)} categories")


class TestClientListsAPI:
    """Test API liste clienti"""
    
    def test_get_client_lists(self, admin_headers):
        """Test recupero liste clienti"""
        response = requests.get(f"{BASE_URL}/api/client-lists", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Client lists retrieved: {len(data)} lists")


class TestModelliTributariAPI:
    """Test API modelli tributari"""
    
    def test_get_modelli_tributari(self, admin_headers):
        """Test recupero modelli tributari"""
        response = requests.get(f"{BASE_URL}/api/modelli-tributari", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Modelli tributari retrieved: {len(data)} models")


class TestActivityLogAPI:
    """Test API log attività"""
    
    def test_get_activity_log(self, admin_headers):
        """Test recupero log attività"""
        response = requests.get(f"{BASE_URL}/api/activity-log", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Activity log retrieved: {len(data)} entries")


class TestDashboardStats:
    """Test statistiche dashboard"""
    
    def test_get_dashboard_stats(self, admin_headers):
        """Test recupero statistiche dashboard"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_clients" in data
        assert "total_documents" in data
        print(f"✓ Dashboard stats: {data.get('total_clients', 0)} clients, {data.get('total_documents', 0)} documents")


class TestClientFeesIntegration:
    """Test integrazione onorari per cliente specifico"""
    
    def test_get_client_fees(self, admin_headers):
        """Test recupero onorari di un cliente specifico"""
        # Prima ottieni lista clienti
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=admin_headers)
        if clients_response.status_code != 200:
            pytest.skip("Cannot get clients list")
        
        clients = clients_response.json()
        if not clients:
            pytest.skip("No clients available")
        
        client_id = clients[0]["id"]
        
        # Recupera onorari del cliente
        response = requests.get(
            f"{BASE_URL}/api/clients/{client_id}/fees",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Client fees retrieved for {clients[0].get('full_name', 'N/A')}: {len(data)} fees")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
