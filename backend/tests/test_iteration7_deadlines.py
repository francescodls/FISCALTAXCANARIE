"""
Iteration 7 Tests - Scadenze Ricorrenti con Promemoria Automatici
Tests for:
1. POST /api/deadlines with list_ids and is_recurring options
2. POST /api/deadlines/send-reminders - Batch reminder sending
3. GET /api/deadlines - Returns deadlines with list_ids
4. next_occurrence calculation for recurring deadlines
5. reminder_days configuration
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COMMERCIALISTA_EMAIL = "info@fiscaltaxcanarie.com"
COMMERCIALISTA_PASSWORD = "Triana48+"


class TestDeadlinesRecurringFeatures:
    """Test deadlines with recurring and list assignment features"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        self.client = api_client
        self.token = auth_token
        self.headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get existing lists
        response = self.client.get(f"{BASE_URL}/api/client-lists", headers=self.headers)
        self.lists = response.json() if response.status_code == 200 else []
        
        # Track created deadlines for cleanup
        self.created_deadline_ids = []
        
        yield
        
        # Cleanup created deadlines
        for deadline_id in self.created_deadline_ids:
            try:
                self.client.delete(f"{BASE_URL}/api/deadlines/{deadline_id}", headers=self.headers)
            except:
                pass
    
    def test_api_health_check(self, api_client):
        """Verify API is accessible"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "Fiscal Tax Canarie" in data.get("message", "") or "Fiscal Tax Canarie" in data.get("title", "")
        print("✅ API Health Check passed")
    
    def test_get_client_lists(self):
        """Verify client lists are available for deadline assignment"""
        response = self.client.get(f"{BASE_URL}/api/client-lists", headers=self.headers)
        assert response.status_code == 200
        
        lists = response.json()
        assert isinstance(lists, list)
        print(f"✅ GET /api/client-lists - Found {len(lists)} lists")
        
        for lst in lists:
            assert "id" in lst
            assert "name" in lst
            print(f"   - {lst['name']} (ID: {lst['id'][:8]}...)")
    
    def test_create_deadline_with_list_ids(self):
        """Test creating a deadline assigned to client lists"""
        if not self.lists:
            pytest.skip("No client lists available")
        
        list_id = self.lists[0]["id"]
        
        deadline_data = {
            "title": "TEST_Deadline Lista Q1 2026",
            "description": "Test deadline per lista clienti",
            "due_date": "2026-05-15",
            "category": "IGIC",
            "is_recurring": False,
            "applies_to_all": False,
            "client_ids": [],
            "list_ids": [list_id],
            "status": "da_fare",
            "priority": "normale",
            "send_reminders": True,
            "reminder_days": [7, 3, 1, 0],
            "send_notification": False
        }
        
        response = self.client.post(
            f"{BASE_URL}/api/deadlines",
            headers=self.headers,
            json=deadline_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["list_ids"] == [list_id]
        assert data["title"] == deadline_data["title"]
        assert data["send_reminders"] == True
        assert data["reminder_days"] == [7, 3, 1, 0]
        
        self.created_deadline_ids.append(data["id"])
        print(f"✅ POST /api/deadlines with list_ids - Created deadline {data['id'][:8]}...")
    
    def test_create_recurring_deadline_monthly(self):
        """Test creating a monthly recurring deadline"""
        deadline_data = {
            "title": "TEST_Scadenza Mensile",
            "description": "Test scadenza ricorrente mensile",
            "due_date": "2026-02-28",
            "category": "IRPF",
            "is_recurring": True,
            "recurrence_type": "mensile",
            "recurrence_end_date": "",
            "applies_to_all": False,
            "client_ids": [],
            "list_ids": [],
            "status": "da_fare",
            "priority": "normale",
            "send_reminders": True,
            "reminder_days": [7, 3, 1, 0],
            "send_notification": False
        }
        
        response = self.client.post(
            f"{BASE_URL}/api/deadlines",
            headers=self.headers,
            json=deadline_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_recurring"] == True
        assert data["recurrence_type"] == "mensile"
        # next_occurrence should be 1 month after due_date
        assert data["next_occurrence"] == "2026-03-28"
        
        self.created_deadline_ids.append(data["id"])
        print(f"✅ Monthly recurring deadline - next_occurrence: {data['next_occurrence']}")
    
    def test_create_recurring_deadline_quarterly(self):
        """Test creating a quarterly recurring deadline"""
        deadline_data = {
            "title": "TEST_Scadenza Trimestrale",
            "description": "Test scadenza ricorrente trimestrale",
            "due_date": "2026-04-20",
            "category": "IGIC",
            "is_recurring": True,
            "recurrence_type": "trimestrale",
            "recurrence_end_date": "2027-12-31",
            "applies_to_all": False,
            "client_ids": [],
            "list_ids": [],
            "status": "da_fare",
            "priority": "alta",
            "send_reminders": True,
            "reminder_days": [7, 3, 1, 0],
            "send_notification": False
        }
        
        response = self.client.post(
            f"{BASE_URL}/api/deadlines",
            headers=self.headers,
            json=deadline_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_recurring"] == True
        assert data["recurrence_type"] == "trimestrale"
        assert data["recurrence_end_date"] == "2027-12-31"
        # next_occurrence should be 3 months after due_date
        assert data["next_occurrence"] == "2026-07-20"
        
        self.created_deadline_ids.append(data["id"])
        print(f"✅ Quarterly recurring deadline - next_occurrence: {data['next_occurrence']}")
    
    def test_create_recurring_deadline_annual(self):
        """Test creating an annual recurring deadline"""
        deadline_data = {
            "title": "TEST_Scadenza Annuale",
            "description": "Test scadenza ricorrente annuale",
            "due_date": "2026-06-30",
            "category": "Impuesto Sociedades",
            "is_recurring": True,
            "recurrence_type": "annuale",
            "recurrence_end_date": "",
            "applies_to_all": False,
            "client_ids": [],
            "list_ids": [],
            "status": "da_fare",
            "priority": "urgente",
            "send_reminders": True,
            "reminder_days": [7, 3, 1, 0],
            "send_notification": False
        }
        
        response = self.client.post(
            f"{BASE_URL}/api/deadlines",
            headers=self.headers,
            json=deadline_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_recurring"] == True
        assert data["recurrence_type"] == "annuale"
        # next_occurrence should be 1 year after due_date
        assert data["next_occurrence"] == "2027-06-30"
        
        self.created_deadline_ids.append(data["id"])
        print(f"✅ Annual recurring deadline - next_occurrence: {data['next_occurrence']}")
    
    def test_send_reminders_batch(self):
        """Test batch reminder sending endpoint"""
        response = self.client.post(
            f"{BASE_URL}/api/deadlines/send-reminders",
            headers=self.headers,
            json={}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "reminders_sent" in data
        assert "deadlines_processed" in data
        
        print(f"✅ POST /api/deadlines/send-reminders - Success")
        print(f"   Reminders sent: {data['reminders_sent']}")
        print(f"   Deadlines processed: {data['deadlines_processed']}")
    
    def test_get_deadlines_with_list_ids(self):
        """Verify deadlines return list_ids field"""
        response = self.client.get(
            f"{BASE_URL}/api/deadlines",
            headers=self.headers
        )
        
        assert response.status_code == 200
        deadlines = response.json()
        
        # Check that deadlines have list_ids field
        for deadline in deadlines:
            assert "list_ids" in deadline, f"Deadline {deadline.get('id', 'unknown')} missing list_ids"
            assert "is_recurring" in deadline
            assert "send_reminders" in deadline
            assert "reminder_days" in deadline
        
        # Count deadlines with list_ids set
        list_deadlines = [d for d in deadlines if d.get("list_ids")]
        print(f"✅ GET /api/deadlines - {len(deadlines)} total, {len(list_deadlines)} with list_ids")
    
    def test_deadline_response_model_fields(self):
        """Verify DeadlineResponse model has all required fields"""
        if not self.lists:
            pytest.skip("No client lists available")
        
        # Create a deadline with all options
        deadline_data = {
            "title": "TEST_Full Fields Deadline",
            "description": "Test all fields",
            "due_date": "2026-03-15",
            "category": "IVA",
            "is_recurring": True,
            "recurrence_type": "mensile",
            "recurrence_end_date": "2026-12-31",
            "applies_to_all": False,
            "client_ids": [],
            "list_ids": [self.lists[0]["id"]],
            "status": "da_fare",
            "priority": "normale",
            "send_reminders": True,
            "reminder_days": [7, 3, 1, 0],
            "send_notification": False
        }
        
        response = self.client.post(
            f"{BASE_URL}/api/deadlines",
            headers=self.headers,
            json=deadline_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all expected fields in response
        expected_fields = [
            "id", "title", "description", "due_date", "category",
            "is_recurring", "recurrence_type", "recurrence_end_date",
            "applies_to_all", "client_ids", "list_ids",
            "status", "priority", "send_reminders", "reminder_days",
            "next_occurrence", "created_at"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        self.created_deadline_ids.append(data["id"])
        print(f"✅ DeadlineResponse model has all {len(expected_fields)} expected fields")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get authentication token for commercialista"""
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": COMMERCIALISTA_EMAIL, "password": COMMERCIALISTA_PASSWORD}
    )
    
    if response.status_code == 200:
        return response.json().get("access_token")
    
    pytest.fail(f"Failed to authenticate: {response.status_code} - {response.text}")
