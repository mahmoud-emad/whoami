from django.test import TestCase

class ProjectsTestCase(TestCase):
    """
    Projects tests
    """
    def test_post_project(self, i=0):
        """
        Test post projects
        """
        response = self.client.post(
            '/api/projects/',
            data={
                'title': f'Project {i}',
                'link': f'https://example{i}.com',
                'description': f'Hello, world! {i}',
                'tags': [],
                'type': 'project'
                }
            )
        self.assertEqual(response.status_code, 201)
        # Assert there are results key
        self.assertIn('results', response.data)
        self.assertEqual(response.data['results']['title'], f'Project {i}')
        return response.data['results']

    def test_get_projects_with_default_pagination(self):
        """
        Test get projects with pagination, default is 10
        """
        for i in range(10):
            self.test_post_project(i)

        response = self.client.get('/api/projects/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 10)

    def test_get_projects_with_custom_pagination(self):
        """
        Test get projects with custom pagination
        """
        for i in range(10):
            self.test_post_project(i)

        response = self.client.get('/api/projects/?page_size=5')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 5)

    def test_get_project(self):
        """
        Test get project
        """
        self.test_post_project()
        response = self.client.get('/api/projects/1/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['results']['title'], 'Project 0')

    def test_get_project_not_found(self):
        """
        Test get project not found
        """
        response = self.client.get('/api/projects/1/')
        self.assertEqual(response.status_code, 404)

    def test_delete_project(self):
        """
        Test delete project
        """
        self.test_post_project()
        response = self.client.delete('/api/projects/1/')
        self.assertEqual(response.status_code, 204)

    def test_delete_project_not_found(self):
        """
        Test delete project not found
        """
        response = self.client.delete('/api/projects/1/')
        self.assertEqual(response.status_code, 404)

    def test_put_project(self):
        """
        Test put project
        """
        self.test_post_project()
        response = self.client.put(
            '/api/projects/1/',
            data={
                'title': 'Project 2',
                'link': 'https://example1.com',
                'description': 'Hello, world! 1',
                'tags': [],
                'type': 'package'
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['results']['title'], 'Project 2')

    def test_put_project_not_found(self):
        """
        Test put project not found
        """
        response = self.client.put(
            '/api/projects/1/',
            data={
                'title': 'Project 2',
                'link': 'https://example2.com',
                'description': 'Hello, world! 2',
                'tags': ['tag1', 'tag2', 'tag3'],
                'type': 'package'
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)

    def test_put_project_invalid_data(self):
        """
        Test put project invalid data
        """
        self.test_post_project()
        response = self.client.put(
            '/api/projects/1/',
            data={
                'key': 'value',
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_put_project_missing_data(self):
        """
        Test put project missing data
        """
        self.test_post_project()
        response = self.client.put(
            '/api/projects/1/',
            data={},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_put_single_project(self):
        """
        Test put single project
        """
        data = self.test_post_project()
        data['title'] = 'Project 2'
        response = self.client.put(
            '/api/projects/1/',
            data=data,
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['results']['title'], 'Project 2')

class ProjectTagsTestCase(TestCase):
    """
    Project tags tests
    """
    def test_post_project_tags(self, i=0):
        """
        Test post projects
        """
        response = self.client.post(
            '/api/projects/tags/',
            data={
                'name': f'Tag {i}',
                'description': f'Hello, world tag {i}!',
                }
            )
        self.assertEqual(response.status_code, 201)
        # Assert there are results key
        self.assertIn('results', response.data)
        self.assertEqual(response.data['results']['name'], f'Tag {i}')
        return response.data['results']
