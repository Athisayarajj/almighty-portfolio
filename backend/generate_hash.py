"""
Run this script to generate your admin password hash.
Usage: python generate_hash.py
Then copy the hash into your Render environment variable: ADMIN_PASSWORD_HASH
"""
import hashlib, getpass

pw = getpass.getpass("Enter your desired admin password: ")
confirm = getpass.getpass("Confirm password: ")

if pw != confirm:
    print("Passwords do not match.")
else:
    h = hashlib.sha256(pw.encode()).hexdigest()
    print(f"\nYour password hash:\n{h}\n")
    print("Copy this into Render → Environment Variables → ADMIN_PASSWORD_HASH")
