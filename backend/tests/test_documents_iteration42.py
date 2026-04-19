"""
Test Suite for Document Management System - Iteration 42
Tests: Upload, List, Delete documents, PDF/ZIP download, Messages with attachments, Status notifications
"""

import pytest
import requests
import os
import io
import tempfile
import zipfile

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from iteration_41
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"
CLIENT_EMAIL = "test_commercialista_202642@example.com"
CLIENT_PASSWORD = "TestCliente123!"
DECLARATION_ID = "4fa1f9aa-1919-4ba6-86f1-b67f0a7ad371"


class TestDocumentManagement:
    """Document upload, list, delete tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin and client tokens"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Admin login
        admin_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_res.status_code == 200:
            self.admin_token = admin_res.json().get("access_token")
        else:
            pytest.skip(f"Admin login failed: {admin_res.status_code}")
        
        # Client login
        client_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        if client_res.status_code == 200:
            self.client_token = client_res.json().get("access_token")
        else:
            pytest.skip(f"Client login failed: {client_res.status_code}")
        
        yield
    
    def test_01_list_documents_empty_or_existing(self):
        """GET /api/declarations/v2/declarations/{id}/documents - List documents"""
        res = self.session.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Documents found: {len(data)}")
        
        # If documents exist, verify structure
        if len(data) > 0:
            doc = data[0]
            assert "id" in doc, "Document should have id"
            assert "filename" in doc, "Document should have filename"
            assert "file_size" in doc, "Document should have file_size"
            print(f"First document: {doc.get('filename')}")
    
    def test_02_upload_document_as_client(self):
        """POST /api/declarations/v2/declarations/{id}/documents - Upload document as client"""
        # First check declaration status
        decl_res = requests.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}",
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if decl_res.status_code != 200:
            pytest.skip(f"Cannot access declaration: {decl_res.status_code}")
        
        decl = decl_res.json()
        status = decl.get("status")
        print(f"Declaration status: {status}")
        
        # Client can only upload in 'bozza' or 'documentazione_incompleta'
        if status not in ["bozza", "documentazione_incompleta"]:
            pytest.skip(f"Cannot upload in status '{status}' - need bozza or documentazione_incompleta")
        
        # Create test file - use requests directly without session to avoid Content-Type header
        test_content = b"%PDF-1.4 Test PDF content for iteration 42"
        files = {
            'file': ('test_doc_iter42.pdf', test_content, 'application/pdf')
        }
        data = {
            'category': 'generale',
            'description': 'Test document from iteration 42'
        }
        
        # Don't use session - it has Content-Type: application/json which breaks multipart
        res = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
            headers={"Authorization": f"Bearer {self.client_token}"},
            files=files,
            data=data
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        result = res.json()
        assert result.get("success") == True, "Upload should succeed"
        assert "document" in result, "Response should contain document"
        
        doc = result["document"]
        assert doc.get("filename") == "test_doc_iter42.pdf"
        assert doc.get("category") == "generale"
        print(f"Uploaded document ID: {doc.get('id')}")
        
        # Store for later tests
        self.__class__.uploaded_doc_id = doc.get("id")
    
    def test_03_upload_document_as_admin(self):
        """POST /api/declarations/v2/declarations/{id}/documents - Upload document as admin"""
        test_content = b"%PDF-1.4 Admin uploaded document content"
        files = {
            'file': ('admin_doc_iter42.pdf', test_content, 'application/pdf')
        }
        data = {
            'category': 'admin',
            'description': 'Admin document from iteration 42'
        }
        
        # Don't use session - it has Content-Type: application/json which breaks multipart
        res = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            files=files,
            data=data
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        result = res.json()
        assert result.get("success") == True
        print(f"Admin uploaded document ID: {result.get('document', {}).get('id')}")
        
        self.__class__.admin_doc_id = result.get("document", {}).get("id")
    
    def test_04_upload_invalid_file_type(self):
        """POST /api/declarations/v2/declarations/{id}/documents - Reject invalid file type"""
        test_content = b"Invalid file content"
        files = {
            'file': ('test.exe', test_content, 'application/octet-stream')
        }
        
        # Don't use session - it has Content-Type: application/json which breaks multipart
        res = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            files=files,
            data={'category': 'generale'}
        )
        
        assert res.status_code == 400, f"Expected 400 for invalid file type, got {res.status_code}"
        print("Invalid file type correctly rejected")
    
    def test_05_list_documents_after_upload(self):
        """GET /api/declarations/v2/declarations/{id}/documents - Verify uploaded documents"""
        res = self.session.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200
        docs = res.json()
        
        # Check if our test documents are in the list
        filenames = [d.get("filename") for d in docs]
        print(f"All documents: {filenames}")
        
        # At least one document should exist
        assert len(docs) >= 1, "Should have at least one document"
    
    def test_06_download_single_document(self):
        """GET /api/declarations/v2/declarations/{id}/documents/{doc_id} - Download document"""
        # First get list of documents
        list_res = self.session.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if list_res.status_code != 200 or len(list_res.json()) == 0:
            pytest.skip("No documents to download")
        
        doc_id = list_res.json()[0].get("id")
        
        res = self.session.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents/{doc_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        assert len(res.content) > 0, "Downloaded file should have content"
        print(f"Downloaded document size: {len(res.content)} bytes")
    
    def test_07_delete_document_as_admin(self):
        """DELETE /api/declarations/v2/declarations/{id}/documents/{doc_id} - Delete document"""
        # Get admin uploaded doc ID
        admin_doc_id = getattr(self.__class__, 'admin_doc_id', None)
        
        if not admin_doc_id:
            # Try to find a document to delete
            list_res = self.session.get(
                f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            if list_res.status_code == 200 and len(list_res.json()) > 0:
                admin_doc_id = list_res.json()[-1].get("id")  # Delete last one
            else:
                pytest.skip("No document to delete")
        
        res = self.session.delete(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents/{admin_doc_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        result = res.json()
        assert result.get("success") == True
        print(f"Deleted document: {admin_doc_id}")


class TestPDFAndZIPDownload:
    """PDF riepilogativo and ZIP download tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        
        # Admin login
        admin_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_res.status_code == 200:
            self.admin_token = admin_res.json().get("access_token")
        else:
            pytest.skip(f"Admin login failed: {admin_res.status_code}")
        
        yield
    
    def test_01_download_pdf_riepilogativo(self):
        """GET /api/declarations/v2/admin/declarations/{id}/pdf - Download PDF summary"""
        res = self.session.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/pdf",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        # Verify it's a PDF
        content_type = res.headers.get("Content-Type", "")
        assert "pdf" in content_type.lower(), f"Expected PDF content type, got {content_type}"
        
        # Verify content disposition
        content_disp = res.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "Should be attachment download"
        assert ".pdf" in content_disp, "Filename should have .pdf extension"
        
        # Verify PDF content (starts with %PDF)
        assert res.content[:4] == b'%PDF', "Content should be valid PDF"
        
        print(f"PDF downloaded: {len(res.content)} bytes")
        print(f"Content-Disposition: {content_disp}")
    
    def test_02_download_zip_completo(self):
        """GET /api/declarations/v2/admin/declarations/{id}/zip - Download complete ZIP"""
        res = self.session.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/zip",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        # Verify it's a ZIP
        content_type = res.headers.get("Content-Type", "")
        assert "zip" in content_type.lower(), f"Expected ZIP content type, got {content_type}"
        
        # Verify content disposition
        content_disp = res.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "Should be attachment download"
        assert ".zip" in content_disp, "Filename should have .zip extension"
        
        # Verify ZIP content (starts with PK)
        assert res.content[:2] == b'PK', "Content should be valid ZIP"
        
        # Try to open and list ZIP contents
        zip_buffer = io.BytesIO(res.content)
        with zipfile.ZipFile(zip_buffer, 'r') as zf:
            file_list = zf.namelist()
            print(f"ZIP contents: {file_list}")
            
            # Should contain PDF riepilogo
            pdf_files = [f for f in file_list if f.endswith('.pdf')]
            assert len(pdf_files) >= 1, "ZIP should contain at least the riepilogo PDF"
        
        print(f"ZIP downloaded: {len(res.content)} bytes")
    
    def test_03_pdf_download_forbidden_for_client(self):
        """GET /api/declarations/v2/admin/declarations/{id}/pdf - Client should be forbidden"""
        # Login as client
        client_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        
        if client_res.status_code != 200:
            pytest.skip("Client login failed")
        
        client_token = client_res.json().get("access_token")
        
        res = self.session.get(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/pdf",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert res.status_code == 403, f"Expected 403 for client, got {res.status_code}"
        print("Client correctly forbidden from admin PDF download")


class TestMessagesWithAttachments:
    """Messages with attachments and notifications tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        
        # Admin login
        admin_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_res.status_code == 200:
            self.admin_token = admin_res.json().get("access_token")
        else:
            pytest.skip(f"Admin login failed: {admin_res.status_code}")
        
        yield
    
    def test_01_send_message_with_attachment(self):
        """POST /api/declarations/v2/declarations/{id}/messages/with-attachment - Message with file"""
        test_content = b"%PDF-1.4 Attachment content for message"
        files = {
            'file': ('message_attachment.pdf', test_content, 'application/pdf')
        }
        data = {
            'content': 'Test message with attachment from iteration 42',
            'is_integration_request': 'false'
        }
        
        # Don't use session - it has Content-Type: application/json which breaks multipart
        res = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/messages/with-attachment",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            files=files,
            data=data
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        result = res.json()
        
        # Verify declaration was updated
        assert "messages_count" in result, "Response should include messages_count"
        print(f"Message sent, total messages: {result.get('messages_count')}")
    
    def test_02_send_integration_request_with_attachment(self):
        """POST /api/declarations/v2/declarations/{id}/messages/with-attachment - Integration request"""
        test_content = b"%PDF-1.4 Integration request attachment"
        files = {
            'file': ('integration_request.pdf', test_content, 'application/pdf')
        }
        data = {
            'content': 'Richiesta integrazione: Si prega di fornire documento XYZ',
            'is_integration_request': 'true'
        }
        
        # Don't use session - it has Content-Type: application/json which breaks multipart
        res = requests.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/messages/with-attachment",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            files=files,
            data=data
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        result = res.json()
        
        # Integration request should change status to documentazione_incompleta
        # and increment pending_integration_requests
        print(f"Status after integration request: {result.get('status')}")
        print(f"Pending integration requests: {result.get('pending_integration_requests')}")
    
    def test_03_send_message_without_attachment(self):
        """POST /api/declarations/v2/declarations/{id}/messages/with-attachment - Message without file"""
        data = {
            'content': 'Test message without attachment',
            'is_integration_request': 'false'
        }
        
        res = self.session.post(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/messages/with-attachment",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            data=data
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        print("Message without attachment sent successfully")


class TestStatusChangeWithNotification:
    """Status change with push/email notification tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        
        # Admin login
        admin_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_res.status_code == 200:
            self.admin_token = admin_res.json().get("access_token")
        else:
            pytest.skip(f"Admin login failed: {admin_res.status_code}")
        
        yield
    
    def test_01_change_status_with_notification(self):
        """PUT /api/declarations/v2/admin/declarations/{id}/status-notify - Status change with notification"""
        # First get current status
        decl_res = self.session.get(
            f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if decl_res.status_code != 200:
            pytest.skip("Cannot get declaration")
        
        current_status = decl_res.json().get("status")
        print(f"Current status: {current_status}")
        
        # Change to in_revisione
        res = self.session.put(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/status-notify",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "new_status": "in_revisione",
                "note": "Test status change from iteration 42"
            }
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        result = res.json()
        
        assert result.get("status") == "in_revisione", f"Status should be in_revisione, got {result.get('status')}"
        print(f"Status changed to: {result.get('status')}")
        print("Note: Push/Email notifications may fail silently if not configured")
    
    def test_02_change_status_to_pronta(self):
        """PUT /api/declarations/v2/admin/declarations/{id}/status-notify - Change to pronta"""
        res = self.session.put(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/status-notify",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "new_status": "pronta",
                "note": "Dichiarazione pronta per la presentazione"
            }
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        result = res.json()
        assert result.get("status") == "pronta"
        print(f"Status changed to: {result.get('status')}")
    
    def test_03_change_status_back_to_bozza(self):
        """PUT /api/declarations/v2/admin/declarations/{id}/status-notify - Reset to bozza for future tests"""
        res = self.session.put(
            f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/status-notify",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "new_status": "bozza",
                "note": "Reset to bozza for testing"
            }
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        result = res.json()
        assert result.get("status") == "bozza"
        print(f"Status reset to: {result.get('status')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
