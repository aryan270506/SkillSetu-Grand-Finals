import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def run_test():
    email = "teststudent@example.com"
    # We will assume this student exists or we test with a known email. 
    # For simplicity, let's use a known user from DB or register one bypassing OTP via direct DB insert.
    pass

run_test()
