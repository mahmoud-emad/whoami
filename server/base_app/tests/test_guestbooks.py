from django.test import TestCase

class GuestbooksTestCase(TestCase):
    """
    Guestbooks tests
    """
    def test_post_guestbook(self, i=0):
        """
        Test post guestbooks
        """
        response = self.client.post(
            '/api/guestbooks/',
            data={
                'name': f'Guestbook {i}',
                'website': f'https://example{i}.com',
                'message': f'Hello, world! {i}'
                }
            )
        self.assertEqual(response.status_code, 201)
        # Assert there are results key
        self.assertIn('results', response.data)
        self.assertEqual(response.data['results']['name'], f'Guestbook {i}')
        return response.data['results']

    def test_get_guestbooks_with_default_pagination(self):
        """
        Test get guestbooks with pagination, default is 10
        """
        for i in range(10):
            self.test_post_guestbook(i)

        response = self.client.get('/api/guestbooks/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 10)

    def test_get_guestbooks_with_custom_pagination(self):
        """
        Test get guestbooks with custom pagination
        """
        for i in range(10):
            self.test_post_guestbook(i)

        response = self.client.get('/api/guestbooks/?page_size=5')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 5)

    def test_get_guestbook(self):
        """
        Test get guestbook
        """
        self.test_post_guestbook()
        response = self.client.get('/api/guestbooks/1/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['results']['name'], 'Guestbook 0')

    def test_get_guestbook_not_found(self):
        """
        Test get guestbook not found
        """
        response = self.client.get('/api/guestbooks/1/')
        self.assertEqual(response.status_code, 404)

    def test_delete_guestbook(self):
        """
        Test delete guestbook
        """
        self.test_post_guestbook()
        response = self.client.delete('/api/guestbooks/1/')
        self.assertEqual(response.status_code, 204)

    def test_delete_guestbook_not_found(self):
        """
        Test delete guestbook not found
        """
        response = self.client.delete('/api/guestbooks/1/')
        self.assertEqual(response.status_code, 404)

    def test_put_guestbook(self):
        """
        Test put guestbook
        """
        self.test_post_guestbook()
        response = self.client.put(
            '/api/guestbooks/1/',
            data={
                'name': 'Guestbook 2',
                'website': 'https://example2.com',
                'message': 'Hello, world! 2'
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['results']['name'], 'Guestbook 2')

    def test_put_guestbook_not_found(self):
        """
        Test put guestbook not found
        """
        response = self.client.put(
            '/api/guestbooks/1/',
            data={
                'name': 'Guestbook 2',
                'website': 'https://example2.com',
                'message': 'Hello, world! 2'
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)

    def test_put_guestbook_invalid_data(self):
        """
        Test put guestbook invalid data
        """
        self.test_post_guestbook()
        response = self.client.put(
            '/api/guestbooks/1/',
            data={
                'key': 'value',
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_put_guestbook_missing_data(self):
        """
        Test put guestbook missing data
        """
        self.test_post_guestbook()
        response = self.client.put(
            '/api/guestbooks/1/',
            data={},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_put_single_guestbook(self):
        """
        Test put single guestbook
        """
        data = self.test_post_guestbook()
        data['name'] = 'Guestbook 2'
        response = self.client.put(
            '/api/guestbooks/1/',
            data=data,
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['results']['name'], 'Guestbook 2')