runserver:
	yarn node backend/server.cjs

install:
	yarn install

runclient:
	yarn dev

test:
	cd server && poetry run python manage.py test base_app.tests

migrate:
	cd server && poetry run python manage.py makemigrations && poetry run python manage.py migrate