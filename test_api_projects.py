#!/usr/bin/env python
"""
NavFlow API Testing Script - Tests Projects & Tasks with Role-Based Access
Tests role-based permissions for projects and tasks
"""

import requests
import json
import time

API_BASE = 'http://localhost:8000/api/v1'

# Test users
TEST_USER_1 = {'email': 'projectowner@example.com', 'password': 'TestPass123!'}
TEST_USER_2 = {'email': 'projectadmin@example.com', 'password': 'TestPass123!'}
TEST_USER_3 = {'email': 'projectmember@example.com', 'password': 'TestPass123!'}

class NavFlowAPITest:
    def __init__(self):
        self.user1_token = None
        self.user2_token = None
        self.user3_token = None
        self.org_id = None
        self.project_id = None
        self.task_id = None
        
    def print_header(self, text):
        print(f"\n{'='*70}")
        print(f"  {text}")
        print(f"{'='*70}")
    
    def print_test(self, text):
        print(f"\n➜ {text}")
    
    def print_success(self, text):
        print(f"  ✅ {text}")
    
    def print_error(self, text):
        print(f"  ❌ {text}")
    
    def register_user(self, email, password):
        """Register a new user"""
        self.print_test(f"Logging in {email}...")
        
        response = requests.post(f'{API_BASE}/auth/login/', json={
            'email': email,
            'password': password
        })
        
        if response.status_code == 200:
            self.print_success(f"User {email} logged in")
            return response.json()
        else:
            self.print_error(f"Failed to login {email}: {response.text}")
            return None
    
    def run_tests(self):
        """Run all tests"""
        self.print_header("NavFlow API - Projects & Tasks Role-Based Testing")
        
        # Step 1: Register/Login users
        self.print_header("Step 1: User Authentication")
        
        user1_data = self.register_user(TEST_USER_1['email'], TEST_USER_1['password'])
        if not user1_data or 'access' not in user1_data:
            self.print_error("Failed to authenticate User 1")
            return
        self.user1_token = user1_data['access']
        
        user2_data = self.register_user(TEST_USER_2['email'], TEST_USER_2['password'])
        if not user2_data or 'access' not in user2_data:
            self.print_error("Failed to authenticate User 2")
            return
        self.user2_token = user2_data['access']
        
        user3_data = self.register_user(TEST_USER_3['email'], TEST_USER_3['password'])
        if not user3_data or 'access' not in user3_data:
            self.print_error("Failed to authenticate User 3")
            return
        self.user3_token = user3_data['access']
        
        # Step 2: Create Organization
        self.print_header("Step 2: Organization Setup")
        self.create_organization()
        
        # Step 3: Create Project (User1 = Owner)
        self.print_header("Step 3: Project Creation")
        self.create_project()
        
        # Step 4: Add Members to Project
        self.print_header("Step 4: Project Member Management")
        self.add_project_members()
        
        # Step 5: Create Tasks
        self.print_header("Step 5: Task Management")
        self.create_tasks()
        
        # Step 6: Test Role-Based Access
        self.print_header("Step 6: Role-Based Access Testing")
        self.test_role_based_access()
        
        self.print_header("✅ All Tests Completed")
    
    def create_organization(self):
        """Create an organization"""
        self.print_test("Creating organization...")
        
        response = requests.post(f'{API_BASE}/orgs/', 
            headers={'Authorization': f'Bearer {self.user1_token}'},
            json={'name': 'Test Organization', 'description': 'Test org for role-based testing'}
        )
        
        if response.status_code == 201:
            org_data = response.json()
            self.org_id = org_data['id']
            self.print_success(f"Organization created: {org_data['name']} (ID: {self.org_id})")
        else:
            self.print_error(f"Failed to create organization: {response.text}")
    
    def create_project(self):
        """Create a project"""
        self.print_test("Creating project...")
        
        response = requests.post(f'{API_BASE}/projects/',
            headers={'Authorization': f'Bearer {self.user1_token}'},
            json={
                'name': 'Test Project',
                'description': 'Project for testing role-based permissions',
                'organization_id': self.org_id
            }
        )
        
        if response.status_code == 201:
            project_data = response.json()
            self.project_id = project_data['id']
            self.print_success(f"Project created: {project_data['name']} (ID: {self.project_id})")
            self.print_success(f"User1 is automatically Owner")
        else:
            self.print_error(f"Failed to create project: {response.text}")
    
    def add_project_members(self):
        """Add members to project with different roles"""
        self.print_test("Adding User2 as Admin...")
        
        response = requests.post(f'{API_BASE}/projects/{self.project_id}/add_member/',
            headers={'Authorization': f'Bearer {self.user1_token}'},
            json={'email': TEST_USER_2['email'], 'role': 'admin'}
        )
        
        if response.status_code == 201:
            self.print_success(f"User2 added as Admin")
        else:
            self.print_error(f"Failed to add User2: {response.text}")
        
        self.print_test("Adding User3 as Member...")
        
        response = requests.post(f'{API_BASE}/projects/{self.project_id}/add_member/',
            headers={'Authorization': f'Bearer {self.user1_token}'},
            json={'email': TEST_USER_3['email'], 'role': 'member'}
        )
        
        if response.status_code == 201:
            self.print_success(f"User3 added as Member")
        else:
            self.print_error(f"Failed to add User3: {response.text}")
    
    def create_tasks(self):
        """Create tasks for the project"""
        self.print_test("Creating task (by Owner)...")
        
        response = requests.post(f'{API_BASE}/tasks/',
            headers={'Authorization': f'Bearer {self.user1_token}'},
            json={
                'project_id': self.project_id,
                'title': 'Test Task 1',
                'description': 'First test task',
                'priority': 'high',
                'status': 'todo'
            }
        )
        
        if response.status_code == 201:
            task_data = response.json()
            self.task_id = task_data['id']
            self.print_success(f"Task created: {task_data['title']} (ID: {self.task_id})")
        else:
            self.print_error(f"Failed to create task: {response.text}")
    
    def test_role_based_access(self):
        """Test role-based permissions"""
        
        # User1 (Owner) - should be able to edit
        self.print_test("User1 (Owner) - Updating task...")
        response = requests.patch(f'{API_BASE}/tasks/{self.task_id}/',
            headers={'Authorization': f'Bearer {self.user1_token}'},
            json={'status': 'in_progress', 'title': 'Updated by Owner'}
        )
        if response.status_code == 200:
            self.print_success("Owner can update task")
        else:
            self.print_error(f"Owner cannot update task: {response.status_code}")
        
        # User2 (Admin) - should be able to edit
        self.print_test("User2 (Admin) - Updating task...")
        response = requests.patch(f'{API_BASE}/tasks/{self.task_id}/',
            headers={'Authorization': f'Bearer {self.user2_token}'},
            json={'status': 'review', 'title': 'Updated by Admin'}
        )
        if response.status_code == 200:
            self.print_success("Admin can update task")
        else:
            self.print_error(f"Admin cannot update task: {response.status_code}")
        
        # User3 (Member) - should NOT be able to edit
        self.print_test("User3 (Member) - Attempting to update task...")
        response = requests.patch(f'{API_BASE}/tasks/{self.task_id}/',
            headers={'Authorization': f'Bearer {self.user3_token}'},
            json={'status': 'done'}
        )
        if response.status_code == 403:
            self.print_success("Member correctly denied task update (403 Forbidden)")
        elif response.status_code == 200:
            self.print_error("Member should not be able to update task!")
        else:
            self.print_error(f"Unexpected response: {response.status_code}")
        
        # Test role-based project operations
        self.print_test("User3 (Member) - Attempting to delete project...")
        response = requests.delete(f'{API_BASE}/projects/{self.project_id}/',
            headers={'Authorization': f'Bearer {self.user3_token}'}
        )
        if response.status_code == 403:
            self.print_success("Member correctly denied project deletion (403 Forbidden)")
        else:
            self.print_error(f"Unexpected response for delete: {response.status_code}")

if __name__ == '__main__':
    tester = NavFlowAPITest()
    tester.run_tests()
