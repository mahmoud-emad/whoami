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
