import requests
res = requests.post("http://127.0.0.1:8000/api/v1/auth/login", data={"username": "admin@example.com", "password": "admin123"})
print(res.status_code)
print(res.text)
