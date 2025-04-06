from django.test import TestCase


class SiteSettingsTestCase(TestCase):
    """
    Site settings tests
    """
    def test_create_new_site_settings(self):
        """
        Test create new site settings
        """
        data = {
            "configuration": {
                "display_admin_dashboard": True,
                "display_navbar_image": True,
                "enable_search": True,
                "multiple_themes": False,
                "search_models": [
                    "projects",
                    "guestbooks",
                    "articles",
                    "posts"
                ],
            },
            "theme":{
                "default_theme": "dark"
            },
            "security": {
                "debug": False,
                "admin_fingerprint_signature": "test_signature"
            },
            "personal": {
                "full_name": "John Doe",
                "email": "x0qMn@example.com",
                "country": "United States",
                "resume_url": "https://example.com/resume.pdf",
                "social": {
                    "github": "https://github.com/johndoe",
                    "linkedin": "https://linkedin.com/in/johndoe",
                    "twitter": "https://twitter.com/johndoe",
                    "whatsapp": "https://wa.me/1234567890",
                    "signal": "https://signal.me/1234567890",
                    "telegram": "https://t.me/johndoe"
                }
            }
        }

        response = self.client.post(
            "/api/dashboard/",
            data=data,
            content_type="application/json",
        )
        results = response.data['results']
        self.assertEqual(response.status_code, 201)
        self.assertEqual(results["configuration"]["display_admin_dashboard"], True)
        self.assertEqual(results["configuration"]["display_navbar_image"], True)
        self.assertEqual(results["configuration"]["enable_search"], True)
        self.assertEqual(results["configuration"]["multiple_themes"], False)
        self.assertEqual(results["configuration"]["search_models"], ["projects", "guestbooks", "articles", "posts"])
        self.assertEqual(results["theme"]["default_theme"], "dark")
        self.assertEqual(results["security"]["debug"], False)
        self.assertEqual(results["security"]["admin_fingerprint_signature"], "test_signature")
        self.assertEqual(results["personal"]["full_name"], "John Doe")
        self.assertEqual(results["personal"]["email"], "x0qMn@example.com")
        self.assertEqual(results["personal"]["country"], "United States")
        self.assertEqual(results["personal"]["resume_url"], "https://example.com/resume.pdf")
        self.assertEqual(results["personal"]["social"]["github"], "https://github.com/johndoe")
        self.assertEqual(results["personal"]["social"]["linkedin"], "https://linkedin.com/in/johndoe")
        self.assertEqual(results["personal"]["social"]["twitter"], "https://twitter.com/johndoe")
        self.assertEqual(results["personal"]["social"]["whatsapp"], "https://wa.me/1234567890")
        self.assertEqual(results["personal"]["social"]["signal"], "https://signal.me/1234567890")
        self.assertEqual(results["personal"]["social"]["telegram"], "https://t.me/johndoe")

    def test_post_empty_data(self):
        """
        Test post empty data
        """
        response = self.client.post("/api/dashboard/", data={}, content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_post_invalid_site_settings(self):
        """
        Test post invalid site settings
        """
        data = {
            "theme": {
                "default_theme": "dark",
            },
            "security": {
                "debug": False,
                "admin_fingerprint_signature": "test_signature",
            },
        }

        response = self.client.post(
            "/api/dashboard/",
            data=data,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_get_site_settings(self):
        """
        Test get site settings
        """
        self.test_create_new_site_settings()
        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"]["configuration"]["display_admin_dashboard"], True)
        self.assertEqual(response.data["results"]["configuration"]["display_navbar_image"], True)
        self.assertEqual(response.data["results"]["configuration"]["enable_search"], True)
        self.assertEqual(response.data["results"]["configuration"]["multiple_themes"], False)
        self.assertEqual(response.data["results"]["configuration"]["search_models"], ["projects", "guestbooks", "articles", "posts"])
        self.assertEqual(response.data["results"]["theme"]["default_theme"], "dark")
        self.assertEqual(response.data["results"]["security"]["debug"], False)
        self.assertEqual(response.data["results"]["security"]["admin_fingerprint_signature"], "test_signature")
        self.assertEqual(response.data["results"]["personal"]["full_name"], "John Doe")
        self.assertEqual(response.data["results"]["personal"]["email"], "x0qMn@example.com")
        self.assertEqual(response.data["results"]["personal"]["country"], "United States")
        self.assertEqual(response.data["results"]["personal"]["resume_url"], "https://example.com/resume.pdf")
        self.assertEqual(response.data["results"]["personal"]["social"]["github"], "https://github.com/johndoe")
        self.assertEqual(response.data["results"]["personal"]["social"]["linkedin"], "https://linkedin.com/in/johndoe")
        self.assertEqual(response.data["results"]["personal"]["social"]["twitter"], "https://twitter.com/johndoe")
        self.assertEqual(response.data["results"]["personal"]["social"]["whatsapp"], "https://wa.me/1234567890")
        self.assertEqual(response.data["results"]["personal"]["social"]["signal"], "https://signal.me/1234567890")
        self.assertEqual(response.data["results"]["personal"]["social"]["telegram"], "https://t.me/johndoe")

    def test_get_not_exist_site_settings(self):
        """
        Test get not exist site settings
        """
        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.status_code, 404)

    def test_patch_site_settings(self):
        """
        Test patch site settings
        """
        self.test_create_new_site_settings()
        data = {
            "configuration": {
                "display_admin_dashboard": False,
                "search_models": ["projects", "articles"],
            },
            "theme": {
                "default_theme": "light",
            },
        }

        response = self.client.patch(
            "/api/dashboard/",
            data=data,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"]["configuration"]["display_admin_dashboard"], False)
        self.assertEqual(response.data["results"]["configuration"]["display_navbar_image"], True)
        self.assertEqual(response.data["results"]["configuration"]["enable_search"], True)
        self.assertEqual(response.data["results"]["configuration"]["multiple_themes"], False)
        self.assertEqual(response.data["results"]["configuration"]["search_models"], ["projects", "articles"])
        self.assertEqual(response.data["results"]["theme"]["default_theme"], "light")
        self.assertEqual(response.data["results"]["security"]["debug"], False)
        self.assertEqual(response.data["results"]["security"]["admin_fingerprint_signature"], "test_signature")
        self.assertEqual(response.data["results"]["personal"]["full_name"], "John Doe")
        self.assertEqual(response.data["results"]["personal"]["email"], "x0qMn@example.com")
        self.assertEqual(response.data["results"]["personal"]["country"], "United States")
        self.assertEqual(response.data["results"]["personal"]["resume_url"], "https://example.com/resume.pdf")
        self.assertEqual(response.data["results"]["personal"]["social"]["github"], "https://github.com/johndoe")
        self.assertEqual(response.data["results"]["personal"]["social"]["linkedin"], "https://linkedin.com/in/johndoe")
        self.assertEqual(response.data["results"]["personal"]["social"]["twitter"], "https://twitter.com/johndoe")
        self.assertEqual(response.data["results"]["personal"]["social"]["whatsapp"], "https://wa.me/1234567890")
        self.assertEqual(response.data["results"]["personal"]["social"]["signal"], "https://signal.me/1234567890")
        self.assertEqual(response.data["results"]["personal"]["social"]["telegram"], "https://t.me/johndoe")

    def test_patch_invalid_field(self):
        self.test_create_new_site_settings()
        data = {
            "nonexistent_field": "oops"
        }
        response = self.client.patch("/api/dashboard/", data=data, content_type="application/json")
        self.assertEqual(response.status_code, 200)  # Should still succeed unless you validate keys
        self.assertNotIn("nonexistent_field", response.data["results"])

    def test_put_site_settings(self):
        self.test_create_new_site_settings()
        data = {
            "theme": {
                "default_theme": "solarized",
            },
            "personal": {
                "full_name": "Jane Smith",
                "email": "jane@example.com"
            }
        }
        response = self.client.put("/api/dashboard/", data=data, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"]["theme"]["default_theme"], "solarized")
        self.assertEqual(response.data["results"]["personal"]["full_name"], "Jane Smith")