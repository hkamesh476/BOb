import unittest
import requests


class IntegrationTests(unittest.TestCase):
    BASE_URL = 'http://127.0.0.1:3000'

    def test_home_page(self):
        r = requests.get(f'{self.BASE_URL}/')
        self.assertEqual(r.status_code, 200)

    # Add more integration tests for your Flask endpoints here


if __name__ == '__main__':
    unittest.main()
