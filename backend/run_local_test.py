from app import app

with app.test_client() as client:
    resp = client.post('/predict', json={'url': 'https://www.google.com/'})
    print('STATUS', resp.status_code)
    try:
        print('JSON', resp.get_json())
    except Exception:
        print('RAW', resp.data)
