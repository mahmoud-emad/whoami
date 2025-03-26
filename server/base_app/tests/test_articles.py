from django.test import TestCase

class ArticlesTestCase(TestCase):
    """
    articles tests
    """
    def test_post_article(self, i=0):
        """
        Test post articles
        """
        response = self.client.post(
            '/api/articles/',
            data={
                    'title': f'article {i}',
                    'link': f'https://example{i}.com',
                    'description': f'Hello, world! {i}'
                }
            )
        self.assertEqual(response.status_code, 201)
        # Assert there are results key
        self.assertIn('results', response.data)
        self.assertEqual(response.data['results']['title'], f'article {i}')
        return response.data['results']

    def test_get_articles_with_default_pagination(self):
        """
        Test get articles with pagination, default is 10
        """
        for i in range(10):
            self.test_post_article(i)

        response = self.client.get('/api/articles/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 10)

    def test_get_articles_with_custom_pagination(self):
        """
        Test get articles with custom pagination
        """
        for i in range(10):
            self.test_post_article(i)

        response = self.client.get('/api/articles/?page_size=5')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 5)

    def test_get_article(self):
        """
        Test get article
        """
        self.test_post_article()
        response = self.client.get('/api/articles/1/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['results']['title'], 'article 0')

    def test_get_article_not_found(self):
        """
        Test get article not found
        """
        response = self.client.get('/api/articles/1/')
        self.assertEqual(response.status_code, 404)

    def test_delete_article(self):
        """
        Test delete article
        """
        self.test_post_article()
        response = self.client.delete('/api/articles/1/')
        self.assertEqual(response.status_code, 204)

    def test_delete_article_not_found(self):
        """
        Test delete article not found
        """
        response = self.client.delete('/api/articles/1/')
        self.assertEqual(response.status_code, 404)

    def test_put_article(self):
        """
        Test put article
        """
        self.test_post_article()
        response = self.client.put(
            '/api/articles/1/',
            data={
                'title': 'article 2',
                'link': 'https://example2.com',
                'description': 'Hello, world! 2'
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['results']['title'], 'article 2')

    def test_put_article_not_found(self):
        """
        Test put article not found
        """
        response = self.client.put(
            '/api/articles/1/',
            data={
                'title': 'article 2',
                'link': 'https://example2.com',
                'description': 'Hello, world! 2'
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)

    def test_put_article_invalid_data(self):
        """
        Test put article invalid data
        """
        self.test_post_article()
        response = self.client.put(
            '/api/articles/1/',
            data={
                'key': 'value',
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_put_article_missing_data(self):
        """
        Test put article missing data
        """
        self.test_post_article()
        response = self.client.put(
            '/api/articles/1/',
            data={},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    # def test_put_single_article(self):
    #     """
    #     Test put single article
    #     """
    #     data = self.test_post_article()
    #     data['title'] = 'article 2'
    #     response = self.client.put(
    #         '/api/articles/1/',
    #         data=data,
    #         content_type='application/json'
    #     )
    #     self.assertEqual(response.status_code, 200)
    #     self.assertEqual(response.data['results']['title'], 'article 2')