from django.test import TestCase


class PersonalSettingsTestCase(TestCase):
    """
    Personal settings tests
    """

    def test_post_user_settings(self, i=0):
        """
        Test post user settings
        """
        response = self.client.post(
            "/api/dashboard/user_info/",
            data={
                "full_name": f"user {i}",
                "resume_link": f"https://example{i}.com",
                "email": f"user_{i}@example.com",
                "country": "United States",
            },
        )
        self.assertEqual(response.status_code, 201)
        # Assert there are results key
        self.assertIn("results", response.data)
        self.assertEqual(response.data["results"]["full_name"], f"user {i}")
        return response.data["results"]

    def test_post_invalid_user_settings(self, i=0):
        """
        Test post invalid user settings
        """
        response = self.client.post(
            "/api/dashboard/user_info/",
            data={
                "resume_link": f"https://example{i}.com",
                "email": f"user_{i}@example.com",
                "country": "United States",
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_get_user_settings(self):
        """
        Test get user settings
        """
        self.test_post_user_settings()
        response = self.client.get("/api/dashboard/user_info/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["full_name"], "user 0")

    def test_get_user_settings_with_pagination(self):
        """
        Test get user settings with pagination
        """
        for i in range(10):
            self.test_post_user_settings(i)

        response = self.client.get("/api/dashboard/user_info/?page_size=5")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 5)

    def test_get_user_settings_with_id(self):
        """
        Test get user settings with id
        """
        self.test_post_user_settings()
        response = self.client.get("/api/dashboard/user_info/1/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"]["full_name"], "user 0")

    def test_get_user_settings_with_invalid_id(self):
        """
        Test get user settings with invalid id
        """
        response = self.client.get("/api/dashboard/user_info/1/")
        self.assertEqual(response.status_code, 404)

    def test_delete_user_settings(self):
        """
        Test delete user settings
        """
        self.test_post_user_settings()
        response = self.client.delete("/api/dashboard/user_info/1/")
        self.assertEqual(response.status_code, 204)

    def test_update_user_settings(self):
        """
        Test update user settings
        """
        self.test_post_user_settings()
        response = self.client.put(
            "/api/dashboard/user_info/1/",
            data={
                "full_name": "user 1",
                "resume_link": "https://example.com",
                "email": "M7kYl@example.com",
                "country": "United States",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

        response = self.client.get("/api/dashboard/user_info/1/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"]["full_name"], "user 1")

    def test_update_user_settings_with_invalid_id(self):
        """
        Test update user settings with invalid id
        """
        response = self.client.put(
            "/api/dashboard/user_info/1/",
            data={
                "full_name": "user 1",
                "resume_link": "https://example.com",
                "email": "M7kYl@example.com",
                "country": "United States",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)

    def test_update_user_settings_with_invalid_data(self):
        """
        Test update user settings with invalid data
        """
        self.test_post_user_settings()
        response = self.client.put(
            "/api/dashboard/user_info/1/",
            data={
                "full_name": "user 1",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
