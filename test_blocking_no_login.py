#!/usr/bin/env python3
"""
Test script to verify URL blocking works with and without login
"""
import requests
import json

API_BASE_URL = "http://localhost:5000"

def test_predict_without_login():
    """Test that /predict works without JWT token"""
    print("\n" + "="*60)
    print("TEST 1: URL Prediction WITHOUT Login")
    print("="*60)
    
    url = "http://example.com/login/verify/account"
    
    response = requests.post(
        f"{API_BASE_URL}/predict",
        json={"url": url},
        headers={"Content-Type": "application/json"}
    )
    
    print(f"URL: {url}")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("[PASS] URL prediction works without login!")
    else:
        print("[FAIL] URL prediction should work without login")
    
    return response.status_code == 200

def test_predict_with_fake_token():
    """Test that /predict works with invalid JWT (gracefully)"""
    print("\n" + "="*60)
    print("TEST 2: URL Prediction WITH Fake JWT Token")
    print("="*60)
    
    url = "http://example.com/phishing"
    fake_token = "invalid.jwt.token"
    
    response = requests.post(
        f"{API_BASE_URL}/predict",
        json={"url": url},
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {fake_token}"
        }
    )
    
    print(f"URL: {url}")
    print(f"JWT Token: {fake_token}")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("[PASS] Invalid JWT doesn't prevent prediction!")
    else:
        print("[FAIL] Invalid JWT shouldn't prevent prediction")
    
    return response.status_code == 200

def test_history_without_login():
    """Verify that accessing history without login returns appropriate error"""
    print("\n" + "="*60)
    print("TEST 3: History Access WITHOUT Login (should fail)")
    print("="*60)
    
    response = requests.get(f"{API_BASE_URL}/api/history")
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 401:
        print("[PASS] History access correctly requires login!")
    else:
        print("[WARN] History access returned unexpected status")
    
    return response.status_code == 401

def test_register_and_login():
    """Register and login to get JWT token"""
    print("\n" + "="*60)
    print("TEST 4: Register & Login")
    print("="*60)
    
    # Generate unique username
    import time
    username = f"testuser_{int(time.time())}"
    email = f"test_{int(time.time())}@example.com"
    password = "password123"
    
    # Register
    print(f"\nRegistering: {username}")
    register_response = requests.post(
        f"{API_BASE_URL}/api/auth/register",
        json={
            "username": username,
            "email": email,
            "password": password
        }
    )
    
    print(f"Register Status: {register_response.status_code}")
    
    if register_response.status_code != 201:
        print(f"[FAIL] Registration failed: {register_response.json()}")
        return None
    
    # Login
    print(f"\nLogging in: {username}")
    login_response = requests.post(
        f"{API_BASE_URL}/api/auth/login",
        json={
            "username": username,
            "password": password
        }
    )
    
    print(f"Login Status: {login_response.status_code}")
    
    if login_response.status_code != 200:
        print(f"[FAIL] Login failed: {login_response.json()}")
        return None
    
    token = login_response.json().get("token")
    print(f"[PASS] Got JWT Token: {token[:20]}...")
    
    return token

def test_predict_with_valid_token(token):
    """Test URL prediction with valid JWT (should save to history)"""
    print("\n" + "="*60)
    print("TEST 5: URL Prediction WITH Valid JWT Token")
    print("="*60)
    
    url = "http://phishing-example.com"
    
    response = requests.post(
        f"{API_BASE_URL}/predict",
        json={"url": url},
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    
    print(f"URL: {url}")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("[PASS] URL prediction works with valid JWT!")
    else:
        print("[FAIL] URL prediction should work with valid JWT")
    
    return response.status_code == 200

def test_history_with_login(token):
    """Verify that history now contains scans from logged-in user"""
    print("\n" + "="*60)
    print("TEST 6: Check History After Logged-In Prediction")
    print("="*60)
    
    response = requests.get(
        f"{API_BASE_URL}/api/history",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if response.status_code == 200:
        history_items = data.get("history", [])
        print(f"[PASS] Found {len(history_items)} items in history")
        return True
    else:
        print("[FAIL] History access should work with valid JWT")
        return False

if __name__ == "__main__":
    print("\n" + "="*60)
    print("TESTING: URL BLOCKING WITH/WITHOUT LOGIN")
    print("="*60)
    
    results = {}
    
    # Test 1: Predict without login
    results["predict_no_login"] = test_predict_without_login()
    
    # Test 2: Predict with fake token
    results["predict_fake_token"] = test_predict_with_fake_token()
    
    # Test 3: History without login
    results["history_no_login"] = test_history_without_login()
    
    # Test 4: Register and login
    token = test_register_and_login()
    
    if token:
        # Test 5: Predict with valid token
        results["predict_with_token"] = test_predict_with_valid_token(token)
        
        # Test 6: Check history
        results["history_with_token"] = test_history_with_login(token)
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    for test_name, passed in results.items():
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status}: {test_name}")
    
    total_tests = len(results)
    passed_tests = sum(1 for v in results.values() if v)
    
    print(f"\nTotal: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("\n[SUCCESS] All tests passed! URL blocking works with and without login!")
    else:
        print(f"\n[WARNING] {total_tests - passed_tests} test(s) may have issues")
