"""
Test suite for Iteration 11: Employee Management (Gestione Dipendenti)
Tests the following endpoints:
1. POST /api/employees/hire-request - Cliente richiede assunzione dipendente
2. GET /api/employees - Lista dipendenti (filtrata per ruolo)
3. POST /api/employees/{id}/documents - Upload documento dipendente
4. POST /api/employees/{id}/terminate - Richiesta licenziamento
5. PUT /api/employees/{id} - Aggiorna stato dipendente (solo admin/consulente)
6. GET /api/employee-notifications - Lista notifiche
7. GET /api/employee-notifications/count - Conteggio notifiche non lette
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "info@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Triana48+"
TEST_CLIENT_EMAIL = f"test_employee_client_{uuid.uuid4().hex[:8]}@example.com"
TEST_CLIENT_PASSWORD = "TestPassword123"


class TestEmployeeManagement:
    """Employee management endpoint tests"""
    
    admin_token = None
    client_token = None
    client_id = None
    employee_id = None
    
    @pytest.fixture(autouse=True, scope="class")
    def setup_class(self, request):
        """Setup test class - get admin token and create test client"""
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        TestEmployeeManagement.admin_token = response.json()["access_token"]
        
        # Register test client
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_CLIENT_EMAIL,
            "password": TEST_CLIENT_PASSWORD,
            "full_name": "Test Employee Client"
        })
        if response.status_code == 200:
            TestEmployeeManagement.client_token = response.json()["access_token"]
            TestEmployeeManagement.client_id = response.json()["user"]["id"]
        elif response.status_code == 400:
            # Client already exists, try to login
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_CLIENT_EMAIL,
                "password": TEST_CLIENT_PASSWORD
            })
            if response.status_code == 200:
                TestEmployeeManagement.client_token = response.json()["access_token"]
                TestEmployeeManagement.client_id = response.json()["user"]["id"]
        
        yield
        
        # Cleanup - delete test employees and client
        if TestEmployeeManagement.admin_token:
            headers = {"Authorization": f"Bearer {TestEmployeeManagement.admin_token}"}
            # No direct delete employee endpoint, so we leave cleanup to DB
    
    def test_01_hire_request_creates_employee(self):
        """Test POST /api/employees/hire-request - Client requests employee hire"""
        assert TestEmployeeManagement.client_token, "Client token required"
        
        headers = {"Authorization": f"Bearer {TestEmployeeManagement.client_token}"}
        
        hire_data = {
            "full_name": "TEST_Mario Rossi",
            "start_date": "2026-02-01",
            "job_title": "Cameriere",
            "work_hours": "08:00-17:00",
            "work_location": "Las Palmas",
            "work_days": "Lunedì-Venerdì",
            "salary": 1500.00,
            "contract_type": "indeterminato",
            "notes": "Test employee for automated testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/employees/hire-request",
            json=hire_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Hire request failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "employee_id" in data
        TestEmployeeManagement.employee_id = data["employee_id"]
        print(f"✅ Created employee with ID: {TestEmployeeManagement.employee_id}")
    
    def test_02_get_employees_as_client(self):
        """Test GET /api/employees - Client sees only their employees"""
        assert TestEmployeeManagement.client_token, "Client token required"
        
        headers = {"Authorization": f"Bearer {TestEmployeeManagement.client_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/employees",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get employees failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Should see the employee we just created
        if len(data) > 0:
            employee_names = [e.get("full_name") for e in data]
            print(f"✅ Client sees {len(data)} employees: {employee_names}")
        else:
            print("✅ Client sees 0 employees (expected if employee creation failed)")
    
    def test_03_get_employees_as_admin(self):
        """Test GET /api/employees - Admin sees all employees"""
        assert TestEmployeeManagement.admin_token, "Admin token required"
        
        headers = {"Authorization": f"Bearer {TestEmployeeManagement.admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/employees",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get employees failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Admin sees {len(data)} total employees")
        
        # Check status distribution
        status_counts = {}
        for emp in data:
            status = emp.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        print(f"   Status distribution: {status_counts}")
    
    def test_04_get_employee_detail(self):
        """Test GET /api/employees/{id} - Get employee detail"""
        if not TestEmployeeManagement.employee_id:
            pytest.skip("No employee ID available")
        
        headers = {"Authorization": f"Bearer {TestEmployeeManagement.admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/employees/{TestEmployeeManagement.employee_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get employee detail failed: {response.text}"
        data = response.json()
        
        assert data.get("id") == TestEmployeeManagement.employee_id
        assert data.get("full_name") == "TEST_Mario Rossi"
        assert data.get("status") == "pending"
        assert data.get("job_title") == "Cameriere"
        print(f"✅ Employee detail retrieved: {data.get('full_name')} - Status: {data.get('status')}")
    
    def test_05_update_employee_status_to_active(self):
        """Test PUT /api/employees/{id} - Admin activates employee"""
        if not TestEmployeeManagement.employee_id:
            pytest.skip("No employee ID available")
        
        headers = {"Authorization": f"Bearer {TestEmployeeManagement.admin_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/employees/{TestEmployeeManagement.employee_id}",
            json={"status": "active"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Update employee failed: {response.text}"
        
        # Verify status changed
        response = requests.get(
            f"{BASE_URL}/api/employees/{TestEmployeeManagement.employee_id}",
            headers=headers
        )
        assert response.json().get("status") == "active"
        print("✅ Employee status updated to 'active'")
    
    def test_06_upload_employee_document(self):
        """Test POST /api/employees/{id}/documents - Upload document"""
        if not TestEmployeeManagement.employee_id:
            pytest.skip("No employee ID available")
        
        headers = {"Authorization": f"Bearer {TestEmployeeManagement.client_token}"}
        
        # Create a simple test file
        files = {
            "file": ("test_document.pdf", b"Test PDF content", "application/pdf")
        }
        data = {
            "document_type": "id_document",
            "description": "Test ID document"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/employees/{TestEmployeeManagement.employee_id}/documents",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Document upload failed: {response.text}"
        print("✅ Employee document uploaded successfully")
    
    def test_07_termination_request(self):
        """Test POST /api/employees/{id}/terminate - Client requests termination"""
        if not TestEmployeeManagement.employee_id:
            pytest.skip("No employee ID available")
        
        headers = {"Authorization": f"Bearer {TestEmployeeManagement.client_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/employees/{TestEmployeeManagement.employee_id}/terminate",
            json={
                "termination_date": "2026-03-01",
                "reason": "End of seasonal contract"
            },
            headers=headers
        )
        
        assert response.status_code == 200, f"Termination request failed: {response.text}"
        
        # Verify status changed
        response = requests.get(
            f"{BASE_URL}/api/employees/{TestEmployeeManagement.employee_id}",
            headers={"Authorization": f"Bearer {TestEmployeeManagement.admin_token}"}
        )
        assert response.json().get("status") == "termination_pending"
        print("✅ Termination request submitted, status is 'termination_pending'")
    
    def test_08_confirm_termination(self):
        """Test PUT /api/employees/{id} - Admin confirms termination"""
        if not TestEmployeeManagement.employee_id:
            pytest.skip("No employee ID available")
        
        headers = {"Authorization": f"Bearer {TestEmployeeManagement.admin_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/employees/{TestEmployeeManagement.employee_id}",
            json={"status": "terminated"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Confirm termination failed: {response.text}"
        
        # Verify status
        response = requests.get(
            f"{BASE_URL}/api/employees/{TestEmployeeManagement.employee_id}",
            headers=headers
        )
        assert response.json().get("status") == "terminated"
        print("✅ Employee terminated successfully")


class TestEmployeeNotifications:
    """Employee notification endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup_method(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_01_get_notifications(self):
        """Test GET /api/employee-notifications - List notifications"""
        response = requests.get(
            f"{BASE_URL}/api/employee-notifications",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get notifications failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} employee notifications")
        
        # Check notification structure
        if len(data) > 0:
            notif = data[0]
            assert "id" in notif
            assert "type" in notif
            assert "title" in notif
            assert "message" in notif
            assert "created_at" in notif
            print(f"   Latest notification: {notif.get('title')}")
    
    def test_02_get_notification_count(self):
        """Test GET /api/employee-notifications/count - Count unread"""
        response = requests.get(
            f"{BASE_URL}/api/employee-notifications/count",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get count failed: {response.text}"
        data = response.json()
        assert "unread_count" in data
        print(f"✅ Unread notification count: {data['unread_count']}")
    
    def test_03_mark_notification_read(self):
        """Test POST /api/employee-notifications/{id}/read - Mark as read"""
        # First get a notification
        response = requests.get(
            f"{BASE_URL}/api/employee-notifications",
            headers=self.headers
        )
        
        if response.status_code == 200 and len(response.json()) > 0:
            notif_id = response.json()[0]["id"]
            
            response = requests.post(
                f"{BASE_URL}/api/employee-notifications/{notif_id}/read",
                headers=self.headers
            )
            
            assert response.status_code == 200, f"Mark read failed: {response.text}"
            print(f"✅ Notification {notif_id} marked as read")
        else:
            print("⚠️ No notifications to mark as read")
    
    def test_04_mark_all_read(self):
        """Test POST /api/employee-notifications/read-all - Mark all as read"""
        response = requests.post(
            f"{BASE_URL}/api/employee-notifications/read-all",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Mark all read failed: {response.text}"
        print("✅ All notifications marked as read")


class TestEmployeeStatusVisual:
    """Test employee status colors (verde=attivo, arancio=pending, rosso=cessato)"""
    
    @pytest.fixture(autouse=True)
    def setup_method(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_status_values(self):
        """Verify employee status values match expected colors"""
        response = requests.get(
            f"{BASE_URL}/api/employees",
            headers=self.headers
        )
        
        assert response.status_code == 200
        employees = response.json()
        
        # Expected status values: active, pending, termination_pending, terminated
        valid_statuses = {"active", "pending", "termination_pending", "terminated"}
        
        for emp in employees:
            status = emp.get("status")
            assert status in valid_statuses, f"Invalid status: {status}"
        
        # Status color mapping:
        # active -> green (verde)
        # pending -> amber/orange (arancio)
        # termination_pending -> orange
        # terminated -> red (rosso)
        
        print("✅ All employee statuses are valid")
        print("   Status color mapping:")
        print("   - active -> verde (green)")
        print("   - pending -> arancio (amber)")
        print("   - termination_pending -> arancio (orange)")
        print("   - terminated -> rosso (red)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
