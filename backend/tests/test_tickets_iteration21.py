"""
Test suite for Ticket System - Iteration 21
Tests ticket CRUD operations, messages, status updates, and admin notifications
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "info@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Triana48+"

# Test client data
TEST_CLIENT_EMAIL = f"test_ticket_client_{uuid.uuid4().hex[:8]}@test.com"
TEST_CLIENT_PASSWORD = "TestPassword123!"
TEST_CLIENT_NAME = "Test Ticket Client"


class TestTicketSystem:
    """Test suite for ticket system functionality"""
    
    admin_token = None
    client_token = None
    client_id = None
    test_ticket_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup test fixtures"""
        if not TestTicketSystem.admin_token:
            # Login as admin
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            assert response.status_code == 200, f"Admin login failed: {response.text}"
            TestTicketSystem.admin_token = response.json()["access_token"]
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {TestTicketSystem.admin_token}"}
    
    def get_client_headers(self):
        return {"Authorization": f"Bearer {TestTicketSystem.client_token}"}
    
    # ==================== AUTH TESTS ====================
    
    def test_01_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "commercialista"
        TestTicketSystem.admin_token = data["access_token"]
        print("✅ Admin login successful")
    
    def test_02_register_test_client(self):
        """Register a test client for ticket testing"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_CLIENT_EMAIL,
            "password": TEST_CLIENT_PASSWORD,
            "full_name": TEST_CLIENT_NAME
        })
        
        if response.status_code == 400 and "già registrata" in response.text:
            # Client already exists, try to login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_CLIENT_EMAIL,
                "password": TEST_CLIENT_PASSWORD
            })
            if login_response.status_code == 200:
                data = login_response.json()
                TestTicketSystem.client_token = data["access_token"]
                TestTicketSystem.client_id = data["user"]["id"]
                print("✅ Test client already exists, logged in")
                return
        
        assert response.status_code == 200, f"Client registration failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "cliente"
        TestTicketSystem.client_token = data["access_token"]
        TestTicketSystem.client_id = data["user"]["id"]
        print(f"✅ Test client registered: {TEST_CLIENT_EMAIL}")
    
    # ==================== TICKET CREATION TESTS ====================
    
    def test_03_client_create_ticket(self):
        """Test client can create a new ticket"""
        if not TestTicketSystem.client_token:
            pytest.skip("Client token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/tickets",
            json={
                "subject": "Test Ticket - Richiesta informazioni",
                "content": "Questo è un ticket di test per verificare il sistema di ticketing."
            },
            headers=self.get_client_headers()
        )
        
        assert response.status_code == 200, f"Ticket creation failed: {response.text}"
        data = response.json()
        
        # Verify ticket structure
        assert "id" in data
        assert data["subject"] == "Test Ticket - Richiesta informazioni"
        assert data["status"] == "aperto"
        assert len(data["messages"]) == 1
        assert data["messages"][0]["content"] == "Questo è un ticket di test per verificare il sistema di ticketing."
        assert data["messages"][0]["sender_role"] == "cliente"
        
        TestTicketSystem.test_ticket_id = data["id"]
        print(f"✅ Ticket created with ID: {data['id']}")
    
    def test_04_admin_cannot_create_ticket(self):
        """Test that admin cannot create tickets (only clients can)"""
        response = requests.post(
            f"{BASE_URL}/api/tickets",
            json={
                "subject": "Admin Test Ticket",
                "content": "This should fail"
            },
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "Solo i clienti" in response.json().get("detail", "")
        print("✅ Admin correctly blocked from creating tickets")
    
    # ==================== TICKET RETRIEVAL TESTS ====================
    
    def test_05_client_get_own_tickets(self):
        """Test client can retrieve their own tickets"""
        if not TestTicketSystem.client_token:
            pytest.skip("Client token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/tickets",
            headers=self.get_client_headers()
        )
        
        assert response.status_code == 200
        tickets = response.json()
        assert isinstance(tickets, list)
        
        # Find our test ticket
        test_ticket = next((t for t in tickets if t["id"] == TestTicketSystem.test_ticket_id), None)
        assert test_ticket is not None, "Test ticket not found in client's tickets"
        assert test_ticket["status"] == "aperto"
        print(f"✅ Client retrieved {len(tickets)} tickets")
    
    def test_06_admin_get_all_tickets(self):
        """Test admin can retrieve all tickets with filters"""
        response = requests.get(
            f"{BASE_URL}/api/tickets",
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200
        tickets = response.json()
        assert isinstance(tickets, list)
        print(f"✅ Admin retrieved {len(tickets)} tickets")
    
    def test_07_admin_filter_tickets_by_status(self):
        """Test admin can filter tickets by status"""
        # Filter by 'aperto' status
        response = requests.get(
            f"{BASE_URL}/api/tickets?status=aperto",
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200
        tickets = response.json()
        
        # All returned tickets should be 'aperto'
        for ticket in tickets:
            assert ticket["status"] == "aperto", f"Expected 'aperto', got '{ticket['status']}'"
        
        print(f"✅ Admin filtered {len(tickets)} open tickets")
    
    def test_08_admin_filter_tickets_by_client(self):
        """Test admin can filter tickets by client_id"""
        if not TestTicketSystem.client_id:
            pytest.skip("Client ID not available")
        
        response = requests.get(
            f"{BASE_URL}/api/tickets?client_id={TestTicketSystem.client_id}",
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200
        tickets = response.json()
        
        # All returned tickets should belong to our test client
        for ticket in tickets:
            assert ticket["client_id"] == TestTicketSystem.client_id
        
        print(f"✅ Admin filtered {len(tickets)} tickets for client")
    
    def test_09_get_single_ticket(self):
        """Test retrieving a single ticket by ID"""
        if not TestTicketSystem.test_ticket_id:
            pytest.skip("Test ticket not created")
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/{TestTicketSystem.test_ticket_id}",
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200
        ticket = response.json()
        assert ticket["id"] == TestTicketSystem.test_ticket_id
        assert "messages" in ticket
        assert "client_name" in ticket
        print(f"✅ Retrieved single ticket: {ticket['subject']}")
    
    # ==================== TICKET MESSAGE TESTS ====================
    
    def test_10_admin_reply_to_ticket(self):
        """Test admin can reply to a ticket"""
        if not TestTicketSystem.test_ticket_id:
            pytest.skip("Test ticket not created")
        
        response = requests.post(
            f"{BASE_URL}/api/tickets/{TestTicketSystem.test_ticket_id}/messages",
            json={"content": "Grazie per il suo messaggio. Stiamo elaborando la sua richiesta."},
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200, f"Admin reply failed: {response.text}"
        ticket = response.json()
        
        # Verify message was added
        assert len(ticket["messages"]) == 2
        admin_message = ticket["messages"][-1]
        assert admin_message["sender_role"] == "commercialista"
        assert "Grazie per il suo messaggio" in admin_message["content"]
        
        print("✅ Admin replied to ticket")
    
    def test_11_client_sees_admin_reply(self):
        """Test client can see admin's reply"""
        if not TestTicketSystem.test_ticket_id or not TestTicketSystem.client_token:
            pytest.skip("Test ticket or client token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/{TestTicketSystem.test_ticket_id}",
            headers=self.get_client_headers()
        )
        
        assert response.status_code == 200
        ticket = response.json()
        
        # Find admin's reply
        admin_replies = [m for m in ticket["messages"] if m["sender_role"] == "commercialista"]
        assert len(admin_replies) > 0, "Admin reply not found"
        
        print("✅ Client can see admin's reply")
    
    def test_12_client_reply_to_ticket(self):
        """Test client can reply to their ticket"""
        if not TestTicketSystem.test_ticket_id or not TestTicketSystem.client_token:
            pytest.skip("Test ticket or client token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/tickets/{TestTicketSystem.test_ticket_id}/messages",
            json={"content": "Grazie per la risposta. Ho un'altra domanda..."},
            headers=self.get_client_headers()
        )
        
        assert response.status_code == 200
        ticket = response.json()
        
        # Verify message was added
        client_messages = [m for m in ticket["messages"] if m["sender_role"] == "cliente"]
        assert len(client_messages) >= 2
        
        print("✅ Client replied to ticket")
    
    # ==================== TICKET STATUS TESTS ====================
    
    def test_13_admin_close_ticket(self):
        """Test admin can close a ticket"""
        if not TestTicketSystem.test_ticket_id:
            pytest.skip("Test ticket not created")
        
        response = requests.put(
            f"{BASE_URL}/api/tickets/{TestTicketSystem.test_ticket_id}/status",
            json={"status": "chiuso"},
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200
        ticket = response.json()
        assert ticket["status"] == "chiuso"
        
        print("✅ Admin closed ticket")
    
    def test_14_cannot_reply_to_closed_ticket(self):
        """Test that replies are blocked on closed tickets"""
        if not TestTicketSystem.test_ticket_id:
            pytest.skip("Test ticket not created")
        
        response = requests.post(
            f"{BASE_URL}/api/tickets/{TestTicketSystem.test_ticket_id}/messages",
            json={"content": "This should fail"},
            headers=self.get_client_headers()
        )
        
        assert response.status_code == 400
        assert "chiuso" in response.json().get("detail", "").lower() or "archiviato" in response.json().get("detail", "").lower()
        
        print("✅ Reply to closed ticket correctly blocked")
    
    def test_15_admin_reopen_ticket(self):
        """Test admin can reopen a closed ticket"""
        if not TestTicketSystem.test_ticket_id:
            pytest.skip("Test ticket not created")
        
        response = requests.put(
            f"{BASE_URL}/api/tickets/{TestTicketSystem.test_ticket_id}/status",
            json={"status": "aperto"},
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200
        ticket = response.json()
        assert ticket["status"] == "aperto"
        
        print("✅ Admin reopened ticket")
    
    def test_16_admin_archive_ticket(self):
        """Test admin can archive a ticket"""
        if not TestTicketSystem.test_ticket_id:
            pytest.skip("Test ticket not created")
        
        response = requests.put(
            f"{BASE_URL}/api/tickets/{TestTicketSystem.test_ticket_id}/status",
            json={"status": "archiviato"},
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200
        ticket = response.json()
        assert ticket["status"] == "archiviato"
        
        print("✅ Admin archived ticket")
    
    def test_17_cannot_reply_to_archived_ticket(self):
        """Test that replies are blocked on archived tickets"""
        if not TestTicketSystem.test_ticket_id:
            pytest.skip("Test ticket not created")
        
        response = requests.post(
            f"{BASE_URL}/api/tickets/{TestTicketSystem.test_ticket_id}/messages",
            json={"content": "This should fail"},
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 400
        
        print("✅ Reply to archived ticket correctly blocked")
    
    # ==================== ADMIN NOTIFICATION TESTS ====================
    
    def test_18_admin_ticket_notifications(self):
        """Test admin can retrieve ticket notifications"""
        response = requests.get(
            f"{BASE_URL}/api/admin/ticket-notifications",
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200
        notifications = response.json()
        assert isinstance(notifications, list)
        
        print(f"✅ Admin retrieved {len(notifications)} ticket notifications")
    
    # ==================== TICKET DELETION TESTS ====================
    
    def test_19_admin_delete_ticket(self):
        """Test admin can delete a ticket"""
        if not TestTicketSystem.test_ticket_id:
            pytest.skip("Test ticket not created")
        
        response = requests.delete(
            f"{BASE_URL}/api/tickets/{TestTicketSystem.test_ticket_id}",
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200
        
        # Verify ticket is deleted
        get_response = requests.get(
            f"{BASE_URL}/api/tickets/{TestTicketSystem.test_ticket_id}",
            headers=self.get_admin_headers()
        )
        assert get_response.status_code == 404
        
        print("✅ Admin deleted ticket")
    
    # ==================== STATUS BADGE COLOR VERIFICATION ====================
    
    def test_20_create_tickets_for_status_verification(self):
        """Create tickets with different statuses to verify badge colors"""
        if not TestTicketSystem.client_token:
            pytest.skip("Client token not available")
        
        # Create a new ticket
        response = requests.post(
            f"{BASE_URL}/api/tickets",
            json={
                "subject": "Status Badge Test Ticket",
                "content": "Testing status badge colors"
            },
            headers=self.get_client_headers()
        )
        
        assert response.status_code == 200
        ticket = response.json()
        ticket_id = ticket["id"]
        
        # Verify initial status is 'aperto' (green badge)
        assert ticket["status"] == "aperto"
        
        # Close the ticket (grey badge)
        close_response = requests.put(
            f"{BASE_URL}/api/tickets/{ticket_id}/status",
            json={"status": "chiuso"},
            headers=self.get_admin_headers()
        )
        assert close_response.status_code == 200
        assert close_response.json()["status"] == "chiuso"
        
        # Archive the ticket (red badge)
        archive_response = requests.put(
            f"{BASE_URL}/api/tickets/{ticket_id}/status",
            json={"status": "archiviato"},
            headers=self.get_admin_headers()
        )
        assert archive_response.status_code == 200
        assert archive_response.json()["status"] == "archiviato"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tickets/{ticket_id}", headers=self.get_admin_headers())
        
        print("✅ Status transitions verified: aperto -> chiuso -> archiviato")


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    """Cleanup test data after all tests"""
    def cleanup_test_data():
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Delete test client if exists
            clients_response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
            if clients_response.status_code == 200:
                for client in clients_response.json():
                    if client.get("email") == TEST_CLIENT_EMAIL:
                        requests.delete(
                            f"{BASE_URL}/api/clients/{client['id']}?permanent=true",
                            headers=headers
                        )
                        print(f"Cleaned up test client: {TEST_CLIENT_EMAIL}")
    
    request.addfinalizer(cleanup_test_data)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
