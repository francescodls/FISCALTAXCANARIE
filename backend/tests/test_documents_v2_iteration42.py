"""
Test Suite for Document Management System - Iteration 42
Tests: Upload, List, Delete documents, PDF/ZIP download, Messages with attachments, Status notifications
Uses module-level fixtures to avoid rate limiting
"""

import pytest
import requests
import os
import io
import zipfile

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"
CLIENT_EMAIL = "test_commercialista_202642@example.com"
CLIENT_PASSWORD = "TestCliente123!"
DECLARATION_ID = "4fa1f9aa-1919-4ba6-86f1-b67f0a7ad371"

# Module-level token storage
_tokens = {}


def get_admin_token():
    """Get or create admin token"""
    if 'admin' not in _tokens:
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if res.status_code == 200:
            _tokens['admin'] = res.json().get("access_token")
        else:
            pytest.skip(f"Admin login failed: {res.status_code} - {res.text}")
    return _tokens.get('admin')


def get_client_token():
    """Get or create client token"""
    if 'client' not in _tokens:
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        if res.status_code == 200:
            _tokens['client'] = res.json().get("access_token")
        else:
            pytest.skip(f"Client login failed: {res.status_code} - {res.text}")
    return _tokens.get('client')


# ============================================================================
# DOCUMENT MANAGEMENT TESTS
# ============================================================================

def test_01_list_documents():
    """GET /api/declarations/v2/declarations/{id}/documents - List documents"""
    token = get_admin_token()
    
    res = requests.get(
        f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert isinstance(data, list), "Response should be a list"
    print(f"Documents found: {len(data)}")
    
    if len(data) > 0:
        doc = data[0]
        assert "id" in doc
        assert "filename" in doc
        print(f"First document: {doc.get('filename')}")


def test_02_upload_document_as_client():
    """POST /api/declarations/v2/declarations/{id}/documents - Upload as client"""
    token = get_client_token()
    
    # Check declaration status first
    decl_res = requests.get(
        f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if decl_res.status_code != 200:
        pytest.skip(f"Cannot access declaration: {decl_res.status_code}")
    
    status = decl_res.json().get("status")
    print(f"Declaration status: {status}")
    
    if status not in ["bozza", "documentazione_incompleta"]:
        pytest.skip(f"Cannot upload in status '{status}'")
    
    # Upload test file
    test_content = b"%PDF-1.4 Test PDF content for iteration 42"
    files = {'file': ('test_doc_iter42.pdf', test_content, 'application/pdf')}
    data = {'category': 'generale', 'description': 'Test document'}
    
    res = requests.post(
        f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        data=data
    )
    
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    result = res.json()
    assert result.get("success") == True
    assert "document" in result
    print(f"Uploaded document ID: {result['document'].get('id')}")


def test_03_upload_document_as_admin():
    """POST /api/declarations/v2/declarations/{id}/documents - Upload as admin"""
    token = get_admin_token()
    
    test_content = b"%PDF-1.4 Admin uploaded document"
    files = {'file': ('admin_doc_iter42.pdf', test_content, 'application/pdf')}
    data = {'category': 'admin', 'description': 'Admin document'}
    
    res = requests.post(
        f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        data=data
    )
    
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    result = res.json()
    assert result.get("success") == True
    print(f"Admin uploaded document ID: {result.get('document', {}).get('id')}")


def test_04_upload_invalid_file_type():
    """POST /api/declarations/v2/declarations/{id}/documents - Reject invalid type"""
    token = get_admin_token()
    
    files = {'file': ('test.exe', b"Invalid content", 'application/octet-stream')}
    
    res = requests.post(
        f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        data={'category': 'generale'}
    )
    
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    print("Invalid file type correctly rejected")


def test_05_download_single_document():
    """GET /api/declarations/v2/declarations/{id}/documents/{doc_id} - Download"""
    token = get_admin_token()
    
    # Get list first
    list_res = requests.get(
        f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if list_res.status_code != 200 or len(list_res.json()) == 0:
        pytest.skip("No documents to download")
    
    doc_id = list_res.json()[0].get("id")
    
    res = requests.get(
        f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert len(res.content) > 0
    print(f"Downloaded document size: {len(res.content)} bytes")


def test_06_delete_document():
    """DELETE /api/declarations/v2/declarations/{id}/documents/{doc_id} - Delete"""
    token = get_admin_token()
    
    # Get list first
    list_res = requests.get(
        f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if list_res.status_code != 200 or len(list_res.json()) == 0:
        pytest.skip("No documents to delete")
    
    # Delete the last document (likely our test doc)
    doc_id = list_res.json()[-1].get("id")
    
    res = requests.delete(
        f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    print(f"Deleted document: {doc_id}")


# ============================================================================
# PDF AND ZIP DOWNLOAD TESTS
# ============================================================================

def test_07_download_pdf_riepilogativo():
    """GET /api/declarations/v2/admin/declarations/{id}/pdf - Download PDF"""
    token = get_admin_token()
    
    res = requests.get(
        f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/pdf",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    
    content_type = res.headers.get("Content-Type", "")
    assert "pdf" in content_type.lower(), f"Expected PDF, got {content_type}"
    
    content_disp = res.headers.get("Content-Disposition", "")
    assert "attachment" in content_disp
    assert ".pdf" in content_disp
    
    # Verify PDF content
    assert res.content[:4] == b'%PDF', "Should be valid PDF"
    print(f"PDF downloaded: {len(res.content)} bytes")


def test_08_download_zip_completo():
    """GET /api/declarations/v2/admin/declarations/{id}/zip - Download ZIP"""
    token = get_admin_token()
    
    res = requests.get(
        f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/zip",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    
    content_type = res.headers.get("Content-Type", "")
    assert "zip" in content_type.lower(), f"Expected ZIP, got {content_type}"
    
    # Verify ZIP content
    assert res.content[:2] == b'PK', "Should be valid ZIP"
    
    # List ZIP contents
    zip_buffer = io.BytesIO(res.content)
    with zipfile.ZipFile(zip_buffer, 'r') as zf:
        file_list = zf.namelist()
        print(f"ZIP contents: {file_list}")
        
        pdf_files = [f for f in file_list if f.endswith('.pdf')]
        assert len(pdf_files) >= 1, "ZIP should contain PDF"
    
    print(f"ZIP downloaded: {len(res.content)} bytes")


def test_09_pdf_forbidden_for_client():
    """GET /api/declarations/v2/admin/declarations/{id}/pdf - Client forbidden"""
    token = get_client_token()
    
    res = requests.get(
        f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/pdf",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert res.status_code == 403, f"Expected 403, got {res.status_code}"
    print("Client correctly forbidden from admin PDF")


# ============================================================================
# MESSAGES WITH ATTACHMENTS TESTS
# ============================================================================

def test_10_send_message_with_attachment():
    """POST /api/declarations/v2/declarations/{id}/messages/with-attachment"""
    token = get_admin_token()
    
    test_content = b"%PDF-1.4 Message attachment"
    files = {'file': ('message_attachment.pdf', test_content, 'application/pdf')}
    data = {
        'content': 'Test message with attachment from iteration 42',
        'is_integration_request': 'false'
    }
    
    res = requests.post(
        f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/messages/with-attachment",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        data=data
    )
    
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    result = res.json()
    assert "messages_count" in result
    print(f"Message sent, total messages: {result.get('messages_count')}")


def test_11_send_integration_request():
    """POST /api/declarations/v2/declarations/{id}/messages/with-attachment - Integration request"""
    token = get_admin_token()
    
    test_content = b"%PDF-1.4 Integration request"
    files = {'file': ('integration.pdf', test_content, 'application/pdf')}
    data = {
        'content': 'Richiesta integrazione: fornire documento XYZ',
        'is_integration_request': 'true'
    }
    
    res = requests.post(
        f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/messages/with-attachment",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        data=data
    )
    
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    result = res.json()
    print(f"Status after integration request: {result.get('status')}")
    print(f"Pending requests: {result.get('pending_integration_requests')}")


def test_12_send_message_without_attachment():
    """POST /api/declarations/v2/declarations/{id}/messages/with-attachment - No file"""
    token = get_admin_token()
    
    data = {
        'content': 'Test message without attachment',
        'is_integration_request': 'false'
    }
    
    res = requests.post(
        f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}/messages/with-attachment",
        headers={"Authorization": f"Bearer {token}"},
        data=data
    )
    
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    print("Message without attachment sent successfully")


# ============================================================================
# STATUS CHANGE WITH NOTIFICATION TESTS
# ============================================================================

def test_13_change_status_with_notification():
    """PUT /api/declarations/v2/admin/declarations/{id}/status-notify"""
    token = get_admin_token()
    
    # Get current status
    decl_res = requests.get(
        f"{BASE_URL}/api/declarations/v2/declarations/{DECLARATION_ID}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if decl_res.status_code != 200:
        pytest.skip("Cannot get declaration")
    
    current_status = decl_res.json().get("status")
    print(f"Current status: {current_status}")
    
    # Change to in_revisione
    res = requests.put(
        f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/status-notify",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={
            "new_status": "in_revisione",
            "note": "Test status change from iteration 42"
        }
    )
    
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    result = res.json()
    assert result.get("status") == "in_revisione"
    print(f"Status changed to: {result.get('status')}")


def test_14_change_status_to_pronta():
    """PUT /api/declarations/v2/admin/declarations/{id}/status-notify - To pronta"""
    token = get_admin_token()
    
    res = requests.put(
        f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/status-notify",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={
            "new_status": "pronta",
            "note": "Dichiarazione pronta"
        }
    )
    
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    result = res.json()
    assert result.get("status") == "pronta"
    print(f"Status changed to: {result.get('status')}")


def test_15_reset_status_to_bozza():
    """PUT /api/declarations/v2/admin/declarations/{id}/status-notify - Reset to bozza"""
    token = get_admin_token()
    
    res = requests.put(
        f"{BASE_URL}/api/declarations/v2/admin/declarations/{DECLARATION_ID}/status-notify",
        headers={
            "Authorization": f"Bearer {token}",
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
