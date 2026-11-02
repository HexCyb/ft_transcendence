COMPOSE := docker compose -f docker-compose.yml

all: up

up:
	$(COMPOSE) up -d --build
	@echo "open https://localhost:8443"

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

clean:
	$(COMPOSE) down --rmi all

re: clean up

.PHONY: all up down logs clean re
