
CMD:=poetry run
client_dir:=cd client
server_dir:=cd server

help:
	# @echo "\n- Docker: To build and run a specific service, execute 'make docker-up service=<service_name>'"
	@echo "\n- To run the backend project, execute 'make run server=<backend>'"
	@echo "\n- To run the frontend project, execute 'make run server=<frontend>'"

install:
	$(server_dir) && poetry install --no-root
	$(server_dir) && poetry check
	$(client_dir) && yarn

run:
ifeq ($(server), backend)
	$(server_dir) && $(CMD) python3 manage.py runserver
else ifeq ($(server), frontend)
	$(client_dir) && yarn dev
endif

# docker-up:
# ifeq ($(service), frontend)
# 	docker compose -f ./docker/docker-compose.yml --env-file=./config/.env up frontend --build -d
# else ifeq ($(service), backend)
# 	docker compose -f ./docker/docker-compose.yml --env-file=./config/.env up backend --build -d
# else ifeq ($(service), postgres)
# 	docker compose -f ./docker/docker-compose.yml --env-file=./config/.env up postgres --build -d
# else
# 	docker compose -f ./docker/docker-compose.yml --env-file=./config/.env up --build -d
# endif

# docker-down:
# ifeq ($(service), frontend)
# 	docker compose -f ./docker/docker-compose.yml --env-file=./config/.env down frontend
# else ifeq ($(service), backend)
# 	docker compose -f ./docker/docker-compose.yml --env-file=./config/.env down backend
# else ifeq ($(service), postgres)
# 	docker compose -f ./docker/docker-compose.yml --env-file=./config/.env down postgres
# else
# 	docker compose -f ./docker/docker-compose.yml --env-file=./config/.env down
# endif

# docker-logs:
# ifeq ($(service), frontend)
# 	docker compose -f ./docker/docker-compose.yml --env-file=./config/.env logs -f frontend
# else ifeq ($(service), backend)
# 	docker compose -f ./docker/docker-compose.yml --env-file=./config/.env logs -f backend
# else ifeq ($(service), postgres)
# 	docker compose -f ./docker/docker-compose.yml --env-file=./config/.env logs -f postgres
# else
# 	docker compose -f ./docker/docker-compose.yml --env-file=./config/.env logs -f
# endif


test:
	$(server_dir) && $(CMD) python3 manage.py test
lint:
	$(server_dir) && $(CMD) black .  --exclude=__init__.py
	$(server_dir) && $(CMD) flake8 .  --exclude=__init__.py
	$(client_dir) && yarn lint
migrate:
	$(server_dir) && $(CMD) python3 manage.py makemigrations
	$(server_dir) && $(CMD) python3 manage.py migrate
user:
	$(server_dir) && $(CMD) python3 manage.py createsuperuser
